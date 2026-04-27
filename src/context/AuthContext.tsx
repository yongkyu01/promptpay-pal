import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { describeRelayType, restoreRelaySession } from "@/lib/relaySession";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Global OAuth relay polling: picks up sessions stored by the external
  // browser after Google / LINE login and restores them inside this client.
  useEffect(() => {
    let cancelled = false;
    let verified = false;
    let retryCount = 0;

    const emitStatus = (status: string) => {
      window.dispatchEvent(new CustomEvent("relay-status", { detail: { status } }));
    };

    const pollRelay = async () => {
      if (cancelled || verified) return;
      const relayId = localStorage.getItem("line_relay_state");
      if (!relayId) return;

      const { data: { session: cur } } = await supabase.auth.getSession();
      if (cur?.user) {
        localStorage.removeItem("line_relay_state");
        localStorage.removeItem("line_relay_ts");
        supabase.from("login_relays").delete().eq("id", relayId).then(() => {});
        emitStatus("done");
        return;
      }

      try {
        const { data } = await supabase
          .from("login_relays")
          .select("token_hash, token_type")
          .eq("id", relayId)
          .maybeSingle();

        if (!data) {
          retryCount++;
          emitStatus(`waiting (${retryCount})`);
          return;
        }

        if (cancelled || verified) return;
        verified = true;
        const relayType = describeRelayType(data.token_type);
        emitStatus(`found relay (${relayType}), verifying...`);

        try { await supabase.auth.signOut({ scope: "local" }); } catch {}

        let success = false;
        for (let attempt = 0; attempt < 3 && !success; attempt++) {
          const { error } = await restoreRelaySession(data);
          if (!error) {
            success = true;
            emitStatus("session restored!");
          } else {
            console.error("[AuthRelay] restore attempt", attempt + 1, "failed:", error.message);
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }

        if (success) {
          localStorage.removeItem("line_relay_state");
          localStorage.removeItem("line_relay_ts");
          supabase.from("login_relays").delete().eq("id", relayId).then(() => {});
          emitStatus("done");
        } else {
          verified = false;
          retryCount++;
        }
      } catch (e) {
        console.error("[AuthRelay] polling error:", e);
        verified = false;
      }
    };

    pollRelay();
    const interval = setInterval(pollRelay, 1200);

    const onResume = () => {
      if (!verified) {
        retryCount = 0;
        pollRelay();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onResume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onResume);
    window.addEventListener("pageshow", onResume);
    document.addEventListener("resume", onResume);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("pageshow", onResume);
      document.removeEventListener("resume", onResume);
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
