import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the calling user using their JWT
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const uid = userData.user.id;

    // Service role client to bypass RLS and delete auth user
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Best-effort cleanup of all user-owned data
    const tables = [
      "expenses",
      "budgets",
      "split_items",
      "split_members",
      "friends",
      "slips",
      "splits",
      "inquiry_replies",
      "inquiries",
      "posts",
      "user_roles",
      "profiles",
    ];
    for (const t of tables) {
      const col = t === "inquiry_replies" || t === "posts" ? "author_id" : "user_id";
      const { error } = await admin.from(t).delete().eq(col, uid);
      if (error) console.error(`delete ${t}:`, error.message);
    }

    // Remove storage objects under user folder in 'slips' bucket (best-effort)
    try {
      const { data: files } = await admin.storage.from("slips").list(uid, { limit: 1000 });
      if (files && files.length > 0) {
        const paths = files.map((f) => `${uid}/${f.name}`);
        await admin.storage.from("slips").remove(paths);
      }
    } catch (e) {
      console.error("storage cleanup:", (e as Error).message);
    }

    // Finally delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});