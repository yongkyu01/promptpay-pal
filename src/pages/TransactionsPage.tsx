import { useApp } from "@/context/AppContext";
import { t, CATEGORY_COLORS } from "@/lib/i18n";

export default function TransactionsPage() {
  const { lang, slips } = useApp();

  // Group by date
  const grouped = slips.reduce<Record<string, typeof slips>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
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
            {grouped[date].map((slip) => (
              <div key={slip.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: CATEGORY_COLORS[slip.category] + "18" }}
                  >
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[slip.category] }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{slip.recipient}</p>
                    <p className="text-xs text-muted-foreground">
                      {slip.time} · {t(slip.category as any, lang)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">-฿{slip.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
