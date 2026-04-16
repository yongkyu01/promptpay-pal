import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Plus, DollarSign, Package, Zap, Truck, Utensils, Box, Megaphone } from "lucide-react";
import { toast } from "sonner";

interface Sale {
  id: string;
  amount: number;
  created_at: string;
}

interface Props {
  todaySales: Sale[];
}

const EXPENSE_CATEGORIES = [
  { key: "cogs", icon: Package, color: "text-red-500" },
  { key: "ingredients", icon: Utensils, color: "text-orange-500" },
  { key: "packaging", icon: Box, color: "text-yellow-600" },
  { key: "labor", icon: DollarSign, color: "text-blue-500" },
  { key: "rent", icon: Zap, color: "text-purple-500" },
  { key: "utilities", icon: Zap, color: "text-cyan-500" },
  { key: "marketing", icon: Megaphone, color: "text-pink-500" },
  { key: "transport", icon: Truck, color: "text-green-500" },
  { key: "other", icon: Minus, color: "text-muted-foreground" },
] as const;

const labels: Record<string, Record<string, string>> = {
  netProfit: { th: "กำไรสุทธิวันนี้", en: "Today's Net Profit", ko: "오늘 순이익", ja: "本日の純利益" },
  revenue: { th: "รายรับ", en: "Revenue", ko: "매출", ja: "売上" },
  expenses: { th: "รายจ่าย", en: "Expenses", ko: "지출", ja: "支出" },
  addExpense: { th: "เพิ่มรายจ่าย", en: "Add Expense", ko: "지출 추가", ja: "支出追加" },
  category: { th: "หมวด", en: "Category", ko: "카테고리", ja: "カテゴリ" },
  amount: { th: "จำนวนเงิน", en: "Amount", ko: "금액", ja: "金額" },
  description: { th: "รายละเอียด", en: "Description", ko: "설명", ja: "説明" },
  save: { th: "บันทึก", en: "Save", ko: "저장", ja: "保存" },
  cogs: { th: "ต้นทุนสินค้า", en: "COGS", ko: "매출원가", ja: "売上原価" },
  ingredients: { th: "วัตถุดิบ", en: "Ingredients", ko: "재료비", ja: "材料費" },
  packaging: { th: "บรรจุภัณฑ์", en: "Packaging", ko: "포장비", ja: "包装費" },
  labor: { th: "ค่าแรง", en: "Labor", ko: "인건비", ja: "人件費" },
  rent: { th: "ค่าเช่า", en: "Rent", ko: "임대료", ja: "家賃" },
  utilities: { th: "ค่าน้ำ/ไฟ", en: "Utilities", ko: "공과금", ja: "光熱費" },
  marketing: { th: "การตลาด", en: "Marketing", ko: "마케팅", ja: "マーケティング" },
  transport: { th: "ค่าขนส่ง", en: "Transport", ko: "운송비", ja: "運送費" },
  other: { th: "อื่นๆ", en: "Other", ko: "기타", ja: "その他" },
  margin: { th: "อัตรากำไร", en: "Margin", ko: "마진율", ja: "利益率" },
};

export default function NetProfitTracker({ todaySales }: Props) {
  const { lang } = useApp();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formCat, setFormCat] = useState("cogs");
  const [formAmt, setFormAmt] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const l = (key: string) => labels[key]?.[lang] || labels[key]?.["en"] || key;

  const today = startOfDay(new Date());

  const { data: merchantExpenses = [] } = useQuery({
    queryKey: ["merchant_expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchant_expenses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const todayExpenses = useMemo(
    () => (merchantExpenses as any[]).filter((e: any) => new Date(e.created_at) >= today),
    [merchantExpenses, today]
  );

  const totalRevenue = todaySales.reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = todayExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  // Group expenses by category
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    todayExpenses.forEach((e: any) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return map;
  }, [todayExpenses]);

  const handleSave = async () => {
    const amt = parseFloat(formAmt);
    if (!amt || amt <= 0 || !user) return;
    setSaving(true);
    try {
      await supabase.from("merchant_expenses").insert({
        user_id: user.id,
        amount: amt,
        category: formCat,
        description: formDesc.trim(),
        date: new Date().toISOString().slice(0, 10),
      } as any);
      toast.success(l("save") + " ✓");
      setFormAmt("");
      setFormDesc("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["merchant_expenses"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200/30 bg-card p-4 space-y-3">
      {/* Net Profit Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {netProfit >= 0 ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
          <h2 className="text-sm font-bold text-foreground">{l("netProfit")}</h2>
        </div>
        <span className="text-xs text-muted-foreground">{l("margin")}: {margin}%</span>
      </div>

      {/* Big Number */}
      <div className="text-center py-2">
        <p className={`text-3xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
          {netProfit >= 0 ? "+" : ""}฿{netProfit.toLocaleString()}
        </p>
      </div>

      {/* Revenue vs Expenses */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-green-500/10 p-3 text-center">
          <p className="text-[10px] text-muted-foreground">{l("revenue")}</p>
          <p className="text-sm font-bold text-green-600">+฿{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-red-500/10 p-3 text-center">
          <p className="text-[10px] text-muted-foreground">{l("expenses")}</p>
          <p className="text-sm font-bold text-red-500">-฿{totalExpenses.toLocaleString()}</p>
        </div>
      </div>

      {/* Profit bar */}
      {totalRevenue > 0 && (
        <div className="w-full h-3 rounded-full bg-secondary/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, ((totalRevenue - totalExpenses) / totalRevenue) * 100))}%` }}
          />
        </div>
      )}

      {/* Expense breakdown */}
      {Object.keys(expenseByCategory).length > 0 && (
        <div className="space-y-1">
          {EXPENSE_CATEGORIES.filter((c) => expenseByCategory[c.key]).map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.key} className="flex items-center justify-between px-2 py-1">
                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 ${cat.color}`} />
                  <span className="text-xs text-foreground">{l(cat.key)}</span>
                </div>
                <span className="text-xs font-semibold text-foreground">-฿{expenseByCategory[cat.key]?.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Add expense form */}
      {showForm ? (
        <div className="space-y-2 rounded-xl bg-secondary/50 p-3 animate-slide-up">
          <select
            value={formCat}
            onChange={(e) => setFormCat(e.target.value)}
            className="w-full rounded-lg border border-amber-200/30 bg-background px-3 py-2 text-sm text-foreground"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{l(c.key)}</option>
            ))}
          </select>
          <input
            type="number"
            inputMode="decimal"
            placeholder={l("amount")}
            value={formAmt}
            onChange={(e) => setFormAmt(e.target.value)}
            className="w-full rounded-lg border border-amber-200/30 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <input
            type="text"
            placeholder={l("description")}
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            className="w-full rounded-lg border border-amber-200/30 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-lg border border-amber-200/30 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
            >
              ✕
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formAmt}
              className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {l("save")}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300/40 py-2.5 text-sm text-amber-600 hover:bg-amber-50/50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {l("addExpense")}
        </button>
      )}
    </div>
  );
}
