import { supabase } from "@/integrations/supabase/client";

interface RelayRecord {
  token_hash: string;
  token_type?: string | null;
}

const isSessionRelay = (tokenType?: string | null) => tokenType === "session";
export const describeRelayType = (tokenType?: string | null) => tokenType || "magiclink";

export async function restoreRelaySession(record: RelayRecord) {
  if (isSessionRelay(record.token_type)) {
    let tokens: { access_token?: string; refresh_token?: string };
    try {
      tokens = JSON.parse(record.token_hash);
    } catch {
      return { error: new Error("invalid relay session payload") };
    }
    if (!tokens.access_token || !tokens.refresh_token) {
      return { error: new Error("relay session payload is missing tokens") };
    }
    try { await supabase.auth.signOut({ scope: "local" }); } catch {}
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    if (!setSessionError) return { error: null };
    const { error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: tokens.refresh_token,
    });
    return { error: refreshError ?? setSessionError };
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: record.token_hash,
    type: (record.token_type || "magiclink") as any,
  });
  return { error: error ?? null };
}
