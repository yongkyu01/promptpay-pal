import { useApp } from "@/context/AppContext";
import { useBudgets } from "@/hooks/useBudgets";
import { getCategoryLabel, getCategoryColor, getCategoryIcon, type Category } from "@/lib/categories";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { t } from "@/lib/i18n";

interface BudgetProgressProps {
  expenses: { category: string; amount: number }[];
}

export default function BudgetProgress({ expenses }: BudgetProgressProps) {
  const { lang } = useApp();
  const { budgets } = useBudgets();
  const navigate = useNavigate();

  if (budgets.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            {t("monthlyBudget", lang)}
          </h2>
          <button onClick={() => navigate("/budgets")} className="text-xs text-primary font-medium">
            <Settings className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => navigate("/budgets")}
          className="w-full rounded-xl border-2 border-dashed border-border py-4 text-xs text-muted-foreground hover:border-primary/50 transition-colors"
        >
          {t("setBudget", lang)}
        </button>
      </div>
    );
  }

  const spendingMap = new Map<string, number>();
  expenses.forEach((e) => {
    const cat = e.category || "other";
    spendingMap.set(cat, (spendingMap.get(cat) || 0) + Number(e.amount));
  });

  const insights: string[] = [];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t("monthlyBudget", lang)}
        </h2>
        <button onClick={() => navigate("/budgets")} className="text-xs text-primary font-medium">
          <Settings className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        {budgets.map((b) => {
          const spent = spendingMap.get(b.category) || 0;
          const limit = Number(b.monthly_limit);
          const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const Icon = getCategoryIcon(b.category);
          const color = getCategoryColor(b.category);
          const isWarning = pct >= 90;
          const isOver = pct >= 100;

          if (isWarning && !isOver) {
            insights.push(
              `⚠️ ${getCategoryLabel(b.category as Category, lang)} ${Math.round(pct)}% ${t("budgetWarning90", lang)}`
            );
          }
          if (isOver) {
            insights.push(
              `🚨 ${getCategoryLabel(b.category as Category, lang)} — ${t("budgetWarning90", lang)}`
            );
          }

          return (
            <div key={b.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                  <span className="text-xs font-medium text-foreground">
                    {getCategoryLabel(b.category as Category, lang)}
                  </span>
                </div>
                <span className={`text-[10px] font-semibold ${isOver ? "text-destructive" : isWarning ? "text-amber-500" : "text-muted-foreground"}`}>
                  ฿{Math.round(spent).toLocaleString()} / ฿{limit.toLocaleString()}
                </span>
              </div>
              <Progress
                value={pct}
                className="h-2"
                style={{ ["--progress-color" as any]: isOver ? "hsl(var(--destructive))" : isWarning ? "#f59e0b" : color }}
              />
            </div>
          );
        })}
      </div>
      {insights.length > 0 && (
        <div className="mt-3 space-y-1">
          {insights.map((msg, i) => (
            <p key={i} className="text-[11px] font-medium text-amber-600 dark:text-amber-400">{msg}</p>
          ))}
        </div>
      )}
    </div>
  );
}
