import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useBudgets } from "@/hooks/useBudgets";
import { CATEGORIES, CATEGORY_MAP, type Category } from "@/lib/categories";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BudgetSettingsPage() {
  const { lang } = useApp();
  const navigate = useNavigate();
  const { budgets, upsertBudget, deleteBudget } = useBudgets();
  const [saving, setSaving] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    budgets.forEach((b) => {
      init[b.category] = String(b.monthly_limit);
    });
    return init;
  });

  const handleSave = async (category: string) => {
    const val = parseFloat(amounts[category] || "0");
    if (val <= 0) {
      // Delete budget if zero
      const existing = budgets.find((b) => b.category === category);
      if (existing) {
        setSaving(category);
        await deleteBudget(existing.id);
        setSaving(null);
        toast.success(lang === "th" ? "ลบงบประมาณแล้ว" : "Budget removed");
      }
      return;
    }
    setSaving(category);
    try {
      await upsertBudget(category, val);
      toast.success(lang === "th" ? "บันทึกแล้ว!" : "Saved!");
    } catch {
      toast.error(lang === "th" ? "บันทึกไม่สำเร็จ" : "Save failed");
    }
    setSaving(null);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-4 pb-24 animate-slide-up">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-xl bg-secondary p-2">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-bold text-foreground">
          {lang === "th" ? "ตั้งงบประมาณรายเดือน" : "Monthly Budget Settings"}
        </h2>
      </div>

      <div className="space-y-3">
        {CATEGORIES.map((cat) => {
          const cfg = CATEGORY_MAP[cat];
          const Icon = cfg.icon;
          const existingBudget = budgets.find((b) => b.category === cat);
          return (
            <div key={cat} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: cfg.color + "18" }}>
                  <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {lang === "th" ? cfg.labelTh : cfg.labelEn}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">฿</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={amounts[cat] || ""}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [cat]: e.target.value }))}
                    placeholder="0"
                    className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={() => handleSave(cat)}
                    disabled={saving === cat}
                    className="rounded-lg gradient-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {saving === cat ? <Loader2 className="h-3 w-3 animate-spin" /> : (lang === "th" ? "บันทึก" : "Save")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
