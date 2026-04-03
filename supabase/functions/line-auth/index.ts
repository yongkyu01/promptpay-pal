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
      // Update metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          line_user_id: profile.userId,
          display_name: profile.displayName,
          avatar_url: profile.pictureUrl,
          provider: "line",
        },
      });
    } else {
      // Create new user
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
        return new Response(JSON.stringify({ error: "Failed to create user", details: createError }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = newUser.user.id;

      // Create profile
      await supabaseAdmin.from("profiles").insert({
        user_id: userId,
        display_name: profile.displayName,
        avatar_url: profile.pictureUrl,
      });
    }

    // Generate session token
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (sessionError || !sessionData) {
      return new Response(JSON.stringify({ error: "Failed to generate session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Redirect back to app with the magic link token
    const appRedirect = stateData.app_redirect || SUPABASE_URL.replace(".supabase.co", ".lovable.app");
    const hashParams = new URL(sessionData.properties?.action_link || "").hash;
    
    const finalRedirect = `${appRedirect}${hashParams}`;

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: finalRedirect },
    });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
