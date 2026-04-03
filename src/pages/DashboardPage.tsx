import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import { getCategoryLabel, getCategoryColor, getCategoryIcon, type Category } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { TrendingUp, Receipt, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { startOfMonth, subMonths, format, isAfter, isBefore, addMonths } from "date-fns";

type Period = "this" | "last" | "3months";

const PERIOD_LABELS: Record<Period, { th: string; en: string }> = {
  this: { th: "เดือนนี้", en: "This Month" },
  last: { th: "เดือนที่แล้ว", en: "Last Month" },
  "3months": { th: "3 เดือน", en: "3 Months" },
};

function getPeriodRange(period: Period) {
  const now = new Date();
  const thisStart = startOfMonth(now);
  switch (period) {
    case "this":
      return { start: thisStart, end: now };
    case "last": {
      const lastStart = subMonths(thisStart, 1);
      return { start: lastStart, end: thisStart };
    }
    case "3months":
      return { start: subMonths(thisStart, 2), end: now };
  }
}

export default function DashboardPage() {
  const { lang } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("this");

  const { data: allExpenses = [] } = useQuery({
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

  const { start, end } = getPeriodRange(period);

  const expenses = useMemo(
    () =>
      allExpenses.filter((e) => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      }),
    [allExpenses, start, end]
  );

  const totalSpending = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      const cat = e.category || "other";
      map.set(cat, (map.get(cat) || 0) + Number(e.amount));
    });
    return Array.from(map.entries())
      .map(([cat, value]) => ({
        key: cat,
        name: getCategoryLabel(cat as Category, lang),
        value: Math.round(value),
        color: getCategoryColor(cat),
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, lang]);

  // Monthly bar chart – last 5 months
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: string; total: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const ms = startOfMonth(subMonths(now, i));
      const me = i === 0 ? now : startOfMonth(subMonths(now, i - 1));
      const total = allExpenses
        .filter((e) => {
          const d = new Date(e.date);
          return d >= ms && d < me;
        })
        .reduce((s, e) => s + Number(e.amount), 0);
      months.push({ month: format(ms, "MMM"), total: Math.round(total) });
    }
    return months;
  }, [allExpenses]);

  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24 animate-slide-up">
      {/* Period Filter */}
      <div className="flex gap-2">
        {(["this", "last", "3months"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              period === p
                ? "gradient-primary text-primary-foreground shadow-primary"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {PERIOD_LABELS[p][lang]}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl gradient-primary p-4 shadow-primary">
          <div className="flex items-center gap-1.5 text-primary-foreground/70">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">{t("totalSpending", lang)}</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-primary-foreground">
            ฿{totalSpending.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-primary-foreground/60">{PERIOD_LABELS[period][lang]}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Receipt className="h-4 w-4" />
            <span className="text-xs font-medium">{t("slipsProcessed", lang)}</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{expenses.length}</p>
          <p className="text-xs text-muted-foreground">{t("slips", lang)}</p>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("categoryBreakdown", lang)}</h2>
        {categoryData.length > 0 ? (
          <>
            <div className="flex items-center gap-4">
              <div className="h-44 w-44 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={68}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      onClick={(_, idx) => {
                        const cat = categoryData[idx]?.key;
                        if (cat) navigate(`/transactions?category=${cat}`);
                      }}
                      style={{ cursor: "pointer" }}
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
              <div className="flex flex-col gap-1.5 overflow-hidden">
                {categoryData.map((d) => {
                  const Icon = getCategoryIcon(d.key);
                  return (
                    <button
                      key={d.key}
                      onClick={() => navigate(`/transactions?category=${d.key}`)}
                      className="flex items-center gap-2 rounded-lg px-1.5 py-0.5 text-left transition-colors hover:bg-secondary"
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: d.color }} />
                      <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                      <span className="ml-auto text-[10px] font-semibold text-foreground whitespace-nowrap">
                        ฿{d.value.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noSlips", lang)}</p>
        )}
      </div>

      {/* Monthly Bar Chart */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          {lang === "th" ? "รายจ่ายรายเดือน" : "Monthly Spending"}
        </h2>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
              <Tooltip
                formatter={(value: number) => [`฿${value.toLocaleString()}`, lang === "th" ? "ยอดใช้จ่าย" : "Spending"]}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{t("recentTransactions", lang)}</h2>
          <button onClick={() => navigate("/transactions")} className="flex items-center gap-1 text-xs font-medium text-primary">
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3">
          {recentExpenses.map((exp) => {
            const Icon = getCategoryIcon(exp.category);
            const color = getCategoryColor(exp.category);
            return (
              <div key={exp.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: color + "18" }}>
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-tight">{exp.recipient}</p>
                    <p className="text-xs text-muted-foreground">
                      {exp.date} · {getCategoryLabel(exp.category as Category, lang)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">-฿{Number(exp.amount).toLocaleString()}</span>
              </div>
            );
          })}
          {recentExpenses.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("noSlips", lang)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
