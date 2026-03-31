import { useApp } from "@/context/AppContext";
import { t, CATEGORY_COLORS, type Category } from "@/lib/i18n";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, Receipt, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

export default function DashboardPage() {
  const { lang, slips } = useApp();
  const navigate = useNavigate();

  const totalSpending = useMemo(() => slips.reduce((sum, s) => sum + s.amount, 0), [slips]);

  const categoryData = useMemo(() => {
    const map = new Map<Category, number>();
    slips.forEach((s) => map.set(s.category, (map.get(s.category) || 0) + s.amount));
    return Array.from(map.entries()).map(([cat, value]) => ({
      name: t(cat as any, lang),
      value: Math.round(value * 100) / 100,
      color: CATEGORY_COLORS[cat],
    }));
  }, [slips, lang]);

  const recentSlips = slips.slice(0, 5);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24 animate-slide-up">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl gradient-primary p-4 shadow-primary">
          <div className="flex items-center gap-1.5 text-primary-foreground/70">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">{t("totalSpending", lang)}</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-primary-foreground">
            ฿{totalSpending.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-primary-foreground/60">{t("thisMonth", lang)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Receipt className="h-4 w-4" />
            <span className="text-xs font-medium">{t("slipsProcessed", lang)}</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{slips.length}</p>
          <p className="text-xs text-muted-foreground">{t("slips", lang)}</p>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("categoryBreakdown", lang)}</h2>
        {categoryData.length > 0 ? (
          <div className="flex items-center gap-4">
            <div className="h-40 w-40 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `฿${value.toLocaleString()}`}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2">
              {categoryData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-xs text-muted-foreground">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noSlips", lang)}</p>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{t("recentTransactions", lang)}</h2>
          <button
            onClick={() => navigate("/transactions")}
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3">
          {recentSlips.map((slip) => (
            <div key={slip.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: CATEGORY_COLORS[slip.category] + "20" }}
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: CATEGORY_COLORS[slip.category] }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">{slip.recipient}</p>
                  <p className="text-xs text-muted-foreground">{slip.date} · {slip.time}</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-foreground">
                -฿{slip.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
