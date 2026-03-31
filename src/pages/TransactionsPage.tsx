import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t, CATEGORY_COLORS, type Category } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function TransactionsPage() {
  const { lang } = useApp();
  const { user } = useAuth();

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const grouped = expenses.reduce<Record<string, typeof expenses>>((acc, e) => {
    (acc[e.date] ??= []).push(e);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24 animate-slide-up">
      <h2 className="text-lg font-bold text-foreground">{t("transactions", lang)}</h2>

      {sortedDates.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">{t("noSlips", lang)}</p>
      )}

      {sortedDates.map((date) => (
        <div key={date}>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">{date}</p>
          <div className="space-y-2">
            {grouped[date].map((exp) => (
              <div key={exp.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: (CATEGORY_COLORS[exp.category as Category] || CATEGORY_COLORS.other) + "18" }}
                  >
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[exp.category as Category] || CATEGORY_COLORS.other }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{exp.recipient}</p>
                    <p className="text-xs text-muted-foreground">
                      {exp.time} · {t((exp.category as Category) as any, lang)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">-฿{Number(exp.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
