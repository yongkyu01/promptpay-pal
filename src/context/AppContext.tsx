import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type AppMode = "user" | "merchant";

interface AppState {
  lang: Lang;
  setLang: (l: Lang) => void;
  mode: AppMode;
  setMode: (m: AppMode) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("th");
  const [mode, setModeState] = useState<AppMode>("user");
  const { user } = useAuth();

  // Load mode from DB
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_settings")
      .select("mode")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.mode === "merchant") setModeState("merchant");
      });
  }, [user]);

  const setMode = async (m: AppMode) => {
    setModeState(m);
    if (!user) return;
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("user_settings")
        .update({ mode: m } as any)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("user_settings")
        .insert({ user_id: user.id, mode: m } as any);
    }
  };

  // Apply merchant theme class
  useEffect(() => {
    if (mode === "merchant") {
      document.documentElement.classList.add("merchant-theme");
    } else {
      document.documentElement.classList.remove("merchant-theme");
    }
  }, [mode]);

  return (
    <AppContext.Provider value={{ lang, setLang, mode, setMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
