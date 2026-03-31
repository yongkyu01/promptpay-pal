import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import { Globe, LogOut } from "lucide-react";

export default function AppHeader() {
  const { lang, setLang } = useApp();
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-primary">
            <span className="text-sm font-bold text-primary-foreground">K</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {t("appName", lang)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "th" ? "en" : "th")}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            <Globe className="h-3.5 w-3.5" />
            {t("language", lang)}
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
