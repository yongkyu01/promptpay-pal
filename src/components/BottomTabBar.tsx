import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";
import { LayoutDashboard, Upload, List, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { key: "dashboard" as const, path: "/", icon: LayoutDashboard },
  { key: "upload" as const, path: "/upload", icon: Upload },
  { key: "transactions" as const, path: "/transactions", icon: List },
  { key: "cleanup" as const, path: "/cleanup", icon: Trash2 },
];

export default function BottomTabBar() {
  const { lang } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {tabs.map(({ key, path, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={key}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 transition-all ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">{t(key, lang)}</span>
              {active && (
                <div className="mt-0.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
