import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://promptpay-buddy.lovable.app";
// The exact redirect_uri registered in LINE Developers Console.
// LINE requires that the redirect_uri sent in BOTH /authorize and /token
// match the registered callback URL EXACTLY.
const LINE_CALLBACK_URI = `https://jogtswuwehgfzvvmnvag.supabase.co/functions/v1/line-auth?action=callback`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LINE_CHANNEL_ID = Deno.env.get("LINE_CHANNEL_ID");
    const LINE_CHANNEL_SECRET = Deno.env.get("LINE_CHANNEL_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET) {
      throw new Error("LINE credentials not configured");
    }

    // ----- Branch: GET ?action=callback  (LINE redirects the browser here) -----
    const url = new URL(req.url);
    const isCallback =
      req.method === "GET" && url.searchParams.get("action") === "callback";

    if (isCallback) {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state") || "";
      const lineError = url.searchParams.get("error");

      if (lineError || !code) {
        const back = new URL(APP_URL);
        back.searchParams.set("line_error", lineError || "missing_code");
        return Response.redirect(back.toString(), 302);
      }

      try {
        const { token_hash, type } = await exchangeAndIssueToken({
          code,
          redirectUri: LINE_CALLBACK_URI,
          LINE_CHANNEL_ID,
          LINE_CHANNEL_SECRET,
          SUPABASE_URL: SUPABASE_URL!,
          SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY!,
        });

        // Store the token_hash in login_relays keyed by `state`
        // so the app (polling on the same state id) can pick it up.
        const { createClient } = await import(
          "https://esm.sh/@supabase/supabase-js@2.49.1"
        );
        const supabaseAdmin = createClient(
          SUPABASE_URL!,
          SUPABASE_SERVICE_ROLE_KEY!,
        );
        await supabaseAdmin.from("login_relays").upsert(
          { id: state, token_hash, token_type: type || "magiclink" },
          { onConflict: "id" },
        );

        // Redirect the user back to the app with a marker so AuthPage shows
        // the "✅ Login successful, return to the app" screen.
        const back = new URL(APP_URL);
        back.searchParams.set("line_done", "1");
        back.searchParams.set("state", state);
        return Response.redirect(back.toString(), 302);
      } catch (e: any) {
        console.error("LINE callback exchange error:", e);
        const back = new URL(APP_URL);
        back.searchParams.set("line_error", e?.message || "exchange_failed");
        return Response.redirect(back.toString(), 302);
      }
    }

    // ----- Branch: POST RPC from the app -----
    const { code, redirectUri } = await req.json().catch(() => ({}));

    // Step 1: no code -> return LINE login URL
    if (!code) {
      const state = crypto.randomUUID();
      // Always use the registered callback URL for /authorize.
      // We pass `state` so the app can later poll login_relays with that id.
      const lineAuthUrl =
        `https://access.line.me/oauth2/v2.1/authorize?response_type=code` +
        `&client_id=${LINE_CHANNEL_ID}` +
        `&redirect_uri=${encodeURIComponent(LINE_CALLBACK_URI)}` +
        `&state=${state}` +
        `&scope=profile%20openid%20email`;

      return new Response(JSON.stringify({ url: lineAuthUrl, state }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2 (legacy POST path with code): kept for backward compatibility.
    const { token_hash, type, email, profile } = await exchangeAndIssueToken({
      code,
      redirectUri: redirectUri || LINE_CALLBACK_URI,
      LINE_CHANNEL_ID,
      LINE_CHANNEL_SECRET,
      SUPABASE_URL: SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY!,
    });

    return new Response(
      JSON.stringify({
        token_hash,
        type,
        email,
        profile,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("LINE auth error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---------- helpers ----------

async function exchangeAndIssueToken(opts: {
  code: string;
  redirectUri: string;
  LINE_CHANNEL_ID: string;
  LINE_CHANNEL_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}) {
  const {
    code,
    redirectUri,
    LINE_CHANNEL_ID,
    LINE_CHANNEL_SECRET,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = opts;

  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: LINE_CHANNEL_ID,
        client_secret: LINE_CHANNEL_SECRET,
      }),
    });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`LINE token error: ${JSON.stringify(tokenData)}`);
  }

  const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
  const profile = await profileRes.json();

  const { createClient } = await import(
    "https://esm.sh/@supabase/supabase-js@2.49.1"
  );
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const lineEmail = `line_${profile.userId}@line.local`;
  let userId: string | null = null;

  try {
    const { data: createdUserData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
          email: lineEmail,
          email_confirm: true,
          user_metadata: {
            full_name: profile.displayName,
            display_name: profile.displayName,
            avatar_url: profile.pictureUrl,
            line_user_id: profile.userId,
            provider: "line",
          },
        });

    if (createError) throw createError;
    userId = createdUserData.user.id;

    try {
      await supabaseAdmin.from("profiles").insert({
          user_id: userId,
          email: lineEmail,
          display_name: profile.displayName,
          avatar_url: profile.pictureUrl,
        });
    } catch (_) { /* ignore */ }
  } catch (createError: any) {
    const alreadyExists =
      createError?.code === "email_exists" ||
      createError?.message?.includes("already been registered");
    if (!alreadyExists) throw createError;

    for (let page = 1; page <= 3 && !userId; page++) {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (!usersData?.users?.length) break;
      const found = usersData.users.find((u: any) => u.email === lineEmail);
      if (found) userId = found.id;
      if (usersData.users.length < 200) break;
    }
  }

  if (userId) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            full_name: profile.displayName,
            display_name: profile.displayName,
            avatar_url: profile.pictureUrl,
            line_user_id: profile.userId,
            provider: "line",
          },
        });
    } catch (_) { /* ignore */ }
  }

  let sessionData: any = null;
  let sessionError: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: lineEmail,
    });
    if (!result.error) {
      sessionData = result.data;
      sessionError = null;
      break;
    }
    sessionError = result.error;
    if (attempt < 1) await new Promise((r) => setTimeout(r, 500));
  }

  if (sessionError) throw sessionError;

  const linkUrl = new URL(sessionData.properties.action_link);
  const token_hash =
    linkUrl.searchParams.get("token_hash") ?? linkUrl.searchParams.get("token");
  const type = linkUrl.searchParams.get("type") ?? "magiclink";

  return {
    token_hash,
    type,
    email: lineEmail,
    profile: {
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    },
  };
}
