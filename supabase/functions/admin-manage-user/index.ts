import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify caller is admin
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, target_user_id } = await req.json();
    if (!action) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_users") {
      // Page through all auth users
      const all: any[] = [];
      let page = 1;
      const perPage = 1000;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const users = data?.users || [];
        all.push(...users);
        if (users.length < perPage) break;
        page++;
        if (page > 20) break;
      }

      const ids = all.map((u) => u.id);
      const [{ data: profs }, { data: roles }] = await Promise.all([
        admin.from("profiles")
          .select("user_id, display_name, avatar_url, created_at")
          .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
        admin.from("user_roles").select("user_id, role").eq("role", "admin"),
      ]);
      const profMap = new Map<string, any>();
      (profs || []).forEach((p: any) => profMap.set(p.user_id, p));
      const adminSet = new Set((roles || []).map((r: any) => r.user_id));

      const merged = all.map((u: any) => {
        const p = profMap.get(u.id) || {};
        return {
          user_id: u.id,
          email: u.email || p.email || null,
          display_name: p.display_name || u.user_metadata?.name || u.user_metadata?.full_name || null,
          avatar_url: p.avatar_url || u.user_metadata?.avatar_url || null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at || null,
          provider: u.app_metadata?.provider || null,
          is_admin: adminSet.has(u.id),
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return new Response(JSON.stringify({ users: merged }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (action === "delete_user") {
      if (!target_user_id) throw new Error("Missing target");
      const { error } = await admin.auth.admin.deleteUser(target_user_id);
      if (error) throw error;
    } else if (action === "add_admin") {
      if (!target_user_id) throw new Error("Missing target");
      const { error } = await admin.from("user_roles")
        .insert({ user_id: target_user_id, role: "admin" });
      if (error && !String(error.message).includes("duplicate")) throw error;
    } else if (action === "remove_admin") {
      if (!target_user_id) throw new Error("Missing target");
      const { error } = await admin.from("user_roles")
        .delete().eq("user_id", target_user_id).eq("role", "admin");
      if (error) throw error;
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});