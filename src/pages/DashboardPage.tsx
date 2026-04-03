import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import { getCategoryLabel, getCategoryColor, getCategoryIcon, type Category } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { TrendingUp, Receipt, ArrowRight, Briefcase, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { startOfMonth, subMonths, format } from "date-fns";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import BudgetProgress from "@/components/dashboard/BudgetProgress";
import GolfReport from "@/components/dashboard/GolfReport";
import GolfBetTracker from "@/components/dashboard/GolfBetTracker";
import ExportButton from "@/components/dashboard/ExportButton";
import ShareCardButton from "@/components/ShareCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Period = "this" | "last" | "3months";

const PERIOD_KEY: Record<Period, "periodThis" | "periodLast" | "period3m"> = {
  this: "periodThis",
  last: "periodLast",
  "3months": "period3m",
};

function getPeriodRange(period: Period) {
  const now = new Date();
  const thisStart = startOfMonth(now);
  switch (period) {
    case "this": return { start: thisStart, end: now };
    case "last": return { start: subMonths(thisStart, 1), end: thisStart };
    case "3months": return { start: subMonths(thisStart, 2), end: now };
  }
}

export default function DashboardPage() {
  const { lang } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("this");
  const { convert: toKRW } = useExchangeRate();
  const [mode, setMode] = useState<"all" | "personal" | "business">("all");

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

  const expenses = useMemo(() => {
    let filtered = allExpenses.filter((e) => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
    if (mode !== "all") {
      filtered = filtered.filter((e) => (e as any).expense_type === mode);
    }
    return filtered;
  }, [allExpenses, start, end, mode]);

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

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: string; total: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const ms = startOfMonth(subMonths(now, i));
      const me = i === 0 ? now : startOfMonth(subMonths(now, i - 1));
      const total = allExpenses
        .filter((e) => {
          const d = new Date(e.date);
          const typeMatch = mode === "all" || (e as any).expense_type === mode;
          return d >= ms && d < me && typeMatch;
        })
        .reduce((s, e) => s + Number(e.amount), 0);
      months.push({ month: format(ms, "MMM"), total: Math.round(total) });
    }
    return months;
  }, [allExpenses, mode]);

  const golfExpenses = useMemo(
    () => expenses.filter((e) => e.category === "golf"),
    [expenses]
  );

  // Business P&L for business tab
  const businessExpenses = useMemo(
    () => expenses.filter((e) => (e as any).expense_type === "business"),
    [expenses]
  );
  const businessTotal = businessExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const recentExpenses = expenses.slice(0, 5);

  // Current month expenses for budget
  const thisMonthExpenses = useMemo(() => {
    const ms = startOfMonth(new Date());
    return allExpenses.filter((e) => new Date(e.date) >= ms);
  }, [allExpenses]);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24 animate-slide-up">
      {/* Mode Toggle */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="text-xs gap-1">
            {t("all", lang)}
          </TabsTrigger>
          <TabsTrigger value="personal" className="text-xs gap-1">
            <UserIcon className="h-3 w-3" />
            {t("personal", lang)}
          </TabsTrigger>
          <TabsTrigger value="business" className="text-xs gap-1">
            <Briefcase className="h-3 w-3" />
            {t("business", lang)}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Period Filter */}
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-2">
          <ShareCardButton
            totalSpending={totalSpending}
            slipCount={expenses.length}
            topCategory={categoryData[0] ? { name: categoryData[0].name, amount: categoryData[0].value } : undefined}
            refNo={recentExpenses[0]?.ref_no ?? undefined}
          />
          <ExportButton expenses={expenses} />
        </div>
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
          <p className="text-[10px] text-primary-foreground/50">
            ≈ ₩{toKRW(totalSpending).toLocaleString()} KRW
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

      {/* Business P&L Summary (only in business mode) */}
      {mode === "business" && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            {lang === "th" ? "สรุปค่าใช้จ่ายธุรกิจ" : "Business Expense Summary"}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-[10px] text-muted-foreground">{lang === "th" ? "รายจ่ายธุรกิจ" : "Business Expenses"}</p>
              <p className="text-lg font-bold text-foreground">฿{Math.round(businessTotal).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">≈ ₩{toKRW(businessTotal).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-[10px] text-muted-foreground">{lang === "th" ? "จำนวนรายการ" : "Transactions"}</p>
              <p className="text-lg font-bold text-foreground">{businessExpenses.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Budget Progress */}
      <BudgetProgress expenses={thisMonthExpenses} />

      {/* Pie Chart */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("categoryBreakdown", lang)}</h2>
        {categoryData.length > 0 ? (
          <div className="flex items-center gap-4">
            <div className="h-44 w-44 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={38} outerRadius={68} paddingAngle={2} dataKey="value" stroke="none"
                    onClick={(_, idx) => {
                      const cat = categoryData[idx]?.key;
                      if (cat) navigate(`/transactions?category=${cat}`);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `฿${value.toLocaleString()}`}
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 overflow-hidden">
              {categoryData.map((d) => {
                const Icon = getCategoryIcon(d.key);
                return (
                  <button key={d.key} onClick={() => navigate(`/transactions?category=${d.key}`)}
                    className="flex items-center gap-2 rounded-lg px-1.5 py-0.5 text-left transition-colors hover:bg-secondary">
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: d.color }} />
                    <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                    <span className="ml-auto text-[10px] font-semibold text-foreground whitespace-nowrap">฿{d.value.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noSlips", lang)}</p>
        )}
      </div>

      {/* Golf Report */}
      <GolfReport golfExpenses={golfExpenses as any} totalSpending={totalSpending} />
      <GolfBetTracker golfExpenses={golfExpenses as any} />

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
                contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
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
              <button key={exp.id} onClick={() => navigate(`/expense/${exp.id}`)}
                className="flex w-full items-center justify-between text-left transition-colors active:bg-secondary rounded-lg px-1 py-0.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: color + "18" }}>
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground leading-tight">{exp.recipient}</p>
                      {(exp as any).expense_type === "business" && (
                        <span className="rounded bg-primary/10 px-1 py-0.5 text-[8px] font-bold text-primary">BIZ</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {exp.date} · {getCategoryLabel(exp.category as Category, lang)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-foreground">-฿{Number(exp.amount).toLocaleString()}</span>
                  <p className="text-[10px] text-muted-foreground">≈₩{toKRW(Number(exp.amount)).toLocaleString()}</p>
                </div>
              </button>
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
