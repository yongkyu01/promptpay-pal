import { useApp } from "@/context/AppContext";
import { CircleDot, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { t } from "@/lib/i18n";

interface GolfExpense {
  amount: number;
  date: string;
  golf_bet_result?: string;
  golf_bet_amount?: number;
}

interface GolfBetTrackerProps {
  golfExpenses: GolfExpense[];
}

export default function GolfBetTracker({ golfExpenses }: GolfBetTrackerProps) {
  const { lang } = useApp();

  const bets = golfExpenses.filter(
    (e) => e.golf_bet_result && e.golf_bet_result !== "none" && Number(e.golf_bet_amount) > 0
  );

  if (bets.length === 0) return null;

  const totalWin = bets
    .filter((e) => e.golf_bet_result === "win")
    .reduce((s, e) => s + Number(e.golf_bet_amount || 0), 0);
  const totalLoss = bets
    .filter((e) => e.golf_bet_result === "loss")
    .reduce((s, e) => s + Number(e.golf_bet_amount || 0), 0);
  const netProfit = totalWin - totalLoss;
  const winRate = bets.length > 0
    ? Math.round((bets.filter((e) => e.golf_bet_result === "win").length / bets.length) * 100)
    : 0;

  const chartData = bets.slice(-10).map((e, i) => ({
    idx: i + 1,
    amount: e.golf_bet_result === "win" ? Number(e.golf_bet_amount) : -Number(e.golf_bet_amount),
    result: e.golf_bet_result,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <CircleDot className="h-4 w-4 text-green-500" />
        <h2 className="text-sm font-semibold text-foreground">
          {t("golfBetTracker", lang)}
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-xl bg-green-500/10 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">{t("won", lang)}</p>
          <p className="text-sm font-bold text-green-500">+฿{totalWin.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-destructive/10 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">{t("lost", lang)}</p>
          <p className="text-sm font-bold text-destructive">-฿{totalLoss.toLocaleString()}</p>
        </div>
        <div className={`rounded-xl p-2.5 text-center ${netProfit >= 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
          <p className="text-[10px] text-muted-foreground">{t("net", lang)}</p>
          <div className="flex items-center justify-center gap-1">
            {netProfit >= 0 ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
            <p className={`text-sm font-bold ${netProfit >= 0 ? "text-green-500" : "text-destructive"}`}>
              {netProfit >= 0 ? "+" : ""}฿{netProfit.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${winRate}%` }} />
        </div>
        <span className="text-xs font-semibold text-muted-foreground">{winRate}% {t("win", lang)}</span>
      </div>

      {chartData.length > 1 && (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={20}>
              <XAxis dataKey="idx" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40}
                tickFormatter={(v) => `${v >= 0 ? "+" : ""}${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => [`฿${Math.abs(value).toLocaleString()}`, value >= 0 ? t("won", lang) : t("lost", lang)]}
                contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.amount >= 0 ? "#22C55E" : "#EF4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
