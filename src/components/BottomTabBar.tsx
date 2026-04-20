import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";
import { LayoutDashboard, List, Users, UserCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { key: "dashboard" as const, path: "/", icon: LayoutDashboard },
  { key: "transactions" as const, path: "/transactions", icon: List },
  { key: "dutchTab" as const, path: "/dutch", icon: Users },
  { key: "myPage" as const, path: "/me", icon: UserCircle },
];

export default function BottomTabBar() {
  const { lang } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {tabs.map(({ key, path, icon: Icon }) => {
          const active = isActive(path);
          return (
            <button
              key={key}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 transition-all ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">{t(key, lang)}</span>
              {active && <div className="mt-0.5 h-1 w-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
