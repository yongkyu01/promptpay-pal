import React, { createContext, useContext, useState, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";

interface AppState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("th");
  return (
    <AppContext.Provider value={{ lang, setLang }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
