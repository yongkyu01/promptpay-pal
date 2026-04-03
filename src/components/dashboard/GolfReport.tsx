import { useApp } from "@/context/AppContext";
import { CircleDot } from "lucide-react";
import { t } from "@/lib/i18n";

interface GolfExpense {
  amount: number;
  golf_green_fee?: number | null;
  golf_caddy_fee?: number | null;
  golf_tip?: number | null;
  golf_lesson_fee?: number | null;
}

interface GolfReportProps {
  golfExpenses: GolfExpense[];
  totalSpending: number;
}

export default function GolfReport({ golfExpenses, totalSpending }: GolfReportProps) {
  const { lang } = useApp();

  if (golfExpenses.length === 0) return null;

  const totalGolf = golfExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalGreen = golfExpenses.reduce((s, e) => s + Number(e.golf_green_fee || 0), 0);
  const totalCaddy = golfExpenses.reduce((s, e) => s + Number(e.golf_caddy_fee || 0), 0);
  const totalTip = golfExpenses.reduce((s, e) => s + Number(e.golf_tip || 0), 0);
  const totalLesson = golfExpenses.reduce((s, e) => s + Number(e.golf_lesson_fee || 0), 0);
  const golfPct = totalSpending > 0 ? ((totalGolf / totalSpending) * 100).toFixed(1) : "0";

  const items = [
    { label: t("greenFee", lang), value: totalGreen, color: "#22C55E" },
    { label: t("caddyFee", lang), value: totalCaddy, color: "#16A34A" },
    { label: t("tips", lang), value: totalTip, color: "#15803D" },
    { label: t("lessonFee", lang), value: totalLesson, color: "#166534" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <CircleDot className="h-4 w-4 text-green-500" />
        <h2 className="text-sm font-semibold text-foreground">
          {t("golfLifeReport", lang)}
        </h2>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <p className="text-2xl font-bold text-foreground">฿{Math.round(totalGolf).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            {golfExpenses.length} {t("rounds", lang)} · {golfPct}% {t("ofTotal", lang)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-secondary p-2.5">
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
            <p className="text-sm font-bold text-foreground">฿{Math.round(item.value).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
