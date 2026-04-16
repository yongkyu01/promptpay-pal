import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t, LANG_OPTIONS } from "@/lib/i18n";
import { Globe, LogOut, Store, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Lang } from "@/lib/i18n";

export default function AppHeader() {
  const { lang, setLang, mode, setMode } = useApp();
  const { signOut } = useAuth();

  const currentLang = LANG_OPTIONS.find((l) => l.key === lang);
  const isMerchant = mode === "merchant";

  return (
    <header className={`sticky top-0 z-40 border-b bg-card/90 backdrop-blur-lg ${isMerchant ? "border-amber-200/30" : "border-border"}`}>
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-sm ${
            isMerchant ? "bg-gradient-to-br from-amber-500 to-yellow-600 shadow-gold" : "gradient-primary shadow-primary"
          }`}>
            <span className="text-sm font-bold text-white">
              {isMerchant ? "M" : "K"}
            </span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {isMerchant ? t("merchantMode", lang) : t("appName", lang)}
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mode Switch */}
          <button
            onClick={() => setMode(isMerchant ? "user" : "merchant")}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ${
              isMerchant
                ? "border-amber-400/40 bg-amber-500/10 text-amber-600"
                : "border-border bg-secondary text-muted-foreground"
            }`}
            title={isMerchant ? t("switchToUser", lang) : t("switchToMerchant", lang)}
          >
            {isMerchant ? <User className="h-3 w-3" /> : <Store className="h-3 w-3" />}
            {isMerchant ? t("switchToUser", lang) : t("switchToMerchant", lang)}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary">
                <Globe className="h-3 w-3" />
                {currentLang?.flag}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANG_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.key}
                  onClick={() => setLang(opt.key)}
                  className={lang === opt.key ? "bg-secondary font-semibold" : ""}
                >
                  {opt.flag} {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            <LogOut className="h-3 w-3" />
          </button>
        </div>
      </div>
    </header>
  );
}
