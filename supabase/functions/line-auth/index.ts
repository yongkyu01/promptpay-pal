import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const LINE_CHANNEL_ID = Deno.env.get("LINE_CHANNEL_ID")!;
  const LINE_CHANNEL_SECRET = Deno.env.get("LINE_CHANNEL_SECRET")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // Step 1: Redirect user to LINE login
  if (action === "login") {
    const redirectUri = url.searchParams.get("redirect_uri") || url.origin + "/line-auth?action=callback";
    const appRedirect = url.searchParams.get("app_redirect") || "";

    const state = btoa(JSON.stringify({ redirect_uri: redirectUri, app_redirect: appRedirect }));

    const lineUrl = new URL(LINE_AUTH_URL);
    lineUrl.searchParams.set("response_type", "code");
    lineUrl.searchParams.set("client_id", LINE_CHANNEL_ID);
    lineUrl.searchParams.set("redirect_uri", redirectUri);
    lineUrl.searchParams.set("state", state);
    lineUrl.searchParams.set("scope", "profile openid email");

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: lineUrl.toString() },
    });
  }

  // Step 2: Handle callback from LINE
  if (action === "callback") {
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");

    if (!code || !stateParam) {
      return new Response("Missing code or state", { status: 400, headers: corsHeaders });
    }

    let stateData: { redirect_uri: string; app_redirect: string };
    try {
      stateData = JSON.parse(atob(stateParam));
    } catch {
      return new Response("Invalid state", { status: 400, headers: corsHeaders });
    }

    // Exchange code for tokens
    const tokenRes = await fetch(LINE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: stateData.redirect_uri,
        client_id: LINE_CHANNEL_ID,
        client_secret: LINE_CHANNEL_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("LINE token exchange failed:", tokenData);
      return new Response(JSON.stringify({ error: "LINE token exchange failed", details: tokenData }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get LINE profile
    const profileRes = await fetch(LINE_PROFILE_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    console.log("LINE profile:", JSON.stringify(profile));

    // Create or sign in user via Supabase Admin
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = `line_${profile.userId}@line.local`;

    // Try to find existing user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email || u.user_metadata?.line_user_id === profile.userId
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          line_user_id: profile.userId,
          display_name: profile.displayName,
          avatar_url: profile.pictureUrl,
          provider: "line",
        },
      });
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          line_user_id: profile.userId,
          display_name: profile.displayName,
          avatar_url: profile.pictureUrl,
          provider: "line",
        },
      });

      if (createError || !newUser.user) {
        console.error("Failed to create user:", createError);
        return new Response(JSON.stringify({ error: "Failed to create user", details: createError }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = newUser.user.id;

      await supabaseAdmin.from("profiles").insert({
        user_id: userId,
        display_name: profile.displayName,
        avatar_url: profile.pictureUrl,
      });
    }

    // Generate magic link - redirect to the action_link directly
    // Supabase will verify the token and redirect to the app with session tokens
    const appRedirect = stateData.app_redirect || "https://promptpay-buddy.lovable.app";

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: appRedirect,
      },
    });

    if (linkError || !linkData) {
      console.error("Failed to generate link:", linkError);
      return new Response(JSON.stringify({ error: "Failed to generate session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The action_link is a Supabase verify URL that will:
    // 1. Verify the magic link token
    // 2. Redirect to redirectTo with access_token & refresh_token in the URL hash
    const actionLink = linkData.properties?.action_link;
    console.log("Redirecting to action_link:", actionLink);

    if (!actionLink) {
      return new Response(JSON.stringify({ error: "No action link generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: actionLink },
    });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
