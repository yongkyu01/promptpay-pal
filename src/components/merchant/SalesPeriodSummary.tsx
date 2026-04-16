import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { startOfDay, startOfWeek, startOfMonth, subMonths } from "date-fns";
import { CalendarDays } from "lucide-react";

interface Sale {
  id: string;
  amount: number;
  created_at: string;
}

interface Props {
  sales: Sale[];
}

type Period = "today" | "week" | "month" | "lastMonth";

const labels: Record<string, Record<string, string>> = {
  today: { th: "วันนี้", en: "Today", ko: "오늘", ja: "今日" },
  week: { th: "สัปดาห์นี้", en: "This Week", ko: "이번 주", ja: "今週" },
  month: { th: "เดือนนี้", en: "This Month", ko: "이번 달", ja: "今月" },
  lastMonth: { th: "เดือนที่แล้ว", en: "Last Month", ko: "지난 달", ja: "先月" },
  totalSales: { th: "ยอดขาย", en: "Sales", ko: "매출", ja: "売上" },
  txCount: { th: "รายการ", en: "transactions", ko: "건", ja: "件" },
  avg: { th: "เฉลี่ย/รายการ", en: "Avg/tx", ko: "평균/건", ja: "平均/件" },
};

export default function SalesPeriodSummary({ sales }: Props) {
  const { lang } = useApp();
  const [period, setPeriod] = useState<Period>("today");

  const l = (key: string) => labels[key]?.[lang] || labels[key]?.["en"] || key;

  const now = new Date();

  const filtered = useMemo(() => {
    switch (period) {
      case "today":
        return sales.filter((s) => new Date(s.created_at) >= startOfDay(now));
      case "week":
        return sales.filter((s) => new Date(s.created_at) >= startOfWeek(now, { weekStartsOn: 1 }));
      case "month":
        return sales.filter((s) => new Date(s.created_at) >= startOfMonth(now));
      case "lastMonth": {
        const lmStart = startOfMonth(subMonths(now, 1));
        const lmEnd = startOfMonth(now);
        return sales.filter((s) => {
          const d = new Date(s.created_at);
          return d >= lmStart && d < lmEnd;
        });
      }
    }
  }, [sales, period, now]);

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const avg = filtered.length > 0 ? Math.round(total / filtered.length) : 0;

  const periods: Period[] = ["today", "week", "month", "lastMonth"];

  return (
    <div className="rounded-2xl border border-amber-200/30 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <CalendarDays className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-foreground">{l("totalSales")}</h2>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1.5 rounded-xl bg-secondary/50 p-1">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all ${
              period === p
                ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {l(p)}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="text-center py-2">
        <p className="text-3xl font-bold text-foreground">฿{total.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {filtered.length} {l("txCount")} · {l("avg")} ฿{avg.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
