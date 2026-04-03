import { useApp } from "@/context/AppContext";
import { CircleDot } from "lucide-react";

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
    { label: lang === "th" ? "กรีนฟี" : "Green Fee", value: totalGreen, color: "#22C55E" },
    { label: lang === "th" ? "แคดดี้" : "Caddy Fee", value: totalCaddy, color: "#16A34A" },
    { label: lang === "th" ? "ทิป" : "Tips", value: totalTip, color: "#15803D" },
    { label: lang === "th" ? "เรียนกอล์ฟ" : "Lesson", value: totalLesson, color: "#166534" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <CircleDot className="h-4 w-4 text-green-500" />
        <h2 className="text-sm font-semibold text-foreground">
          {lang === "th" ? "กอล์ฟ ไลฟ์ รีพอร์ต" : "Golf Life Report"}
        </h2>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <p className="text-2xl font-bold text-foreground">฿{Math.round(totalGolf).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            {golfExpenses.length} {lang === "th" ? "ครั้ง" : "rounds"} · {golfPct}% {lang === "th" ? "ของค่าใช้จ่ายทั้งหมด" : "of total"}
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
