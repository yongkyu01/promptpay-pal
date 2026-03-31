import React, { createContext, useContext, useState, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import type { SlipData } from "@/lib/mockData";
import { INITIAL_SLIPS } from "@/lib/mockData";

interface AppState {
  lang: Lang;
  setLang: (l: Lang) => void;
  slips: SlipData[];
  addSlips: (s: SlipData[]) => void;
  removeSlips: (ids: string[]) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("th");
  const [slips, setSlips] = useState<SlipData[]>(INITIAL_SLIPS);

  const addSlips = (newSlips: SlipData[]) => setSlips((prev) => [...newSlips, ...prev]);
  const removeSlips = (ids: string[]) => setSlips((prev) => prev.filter((s) => !ids.includes(s.id)));

  return (
    <AppContext.Provider value={{ lang, setLang, slips, addSlips, removeSlips }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
