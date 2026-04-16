import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Crown, Users } from "lucide-react";

export default function MerchantCustomersPage() {
  const { lang } = useApp();
  const { user } = useAuth();

  const { data: sales = [] } = useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const customerData = useMemo(() => {
    const map = new Map<string, { count: number; totalAmount: number; lastVisit: string }>();
    sales.forEach((s) => {
      const name = (s.sender_name || "").trim();
      if (!name) return;
      const existing = map.get(name) || { count: 0, totalAmount: 0, lastVisit: "" };
      existing.count += 1;
      existing.totalAmount += Number(s.amount);
      if (!existing.lastVisit || s.created_at > existing.lastVisit) {
        existing.lastVisit = s.created_at;
      }
      map.set(name, existing);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [sales]);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24 animate-slide-up">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-5 w-5 text-amber-500" />
        <h1 className="text-lg font-bold text-foreground">{t("customerHistory", lang)}</h1>
      </div>

      {customerData.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">{t("noSalesYet", lang)}</p>
      )}

      <div className="space-y-2">
        {customerData.map((c) => (
          <div key={c.name} className="rounded-2xl border border-amber-200/30 bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {c.count >= 3 && <Crown className="h-4 w-4 text-amber-500" />}
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(c.lastVisit).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-foreground">{c.count}</span>
                  <span className="text-[10px] text-muted-foreground">{t("visits", lang)}</span>
                </div>
                <p className="text-xs text-amber-600 font-medium">฿{c.totalAmount.toLocaleString()}</p>
                {c.count >= 3 && (
                  <span className="inline-block mt-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                    {t("regularCustomer", lang)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
