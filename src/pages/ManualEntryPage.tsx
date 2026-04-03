import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarIcon, Loader2, Briefcase, User } from "lucide-react";
import { CATEGORIES, CATEGORY_MAP, type Category } from "@/lib/categories";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { t } from "@/lib/i18n";

const PAYMENT_METHODS = [
  { key: "promptpay", tKey: "promptpay" as const },
  { key: "cash", tKey: "cash" as const },
  { key: "bank_transfer", tKey: "bankTransfer" as const },
] as const;

export default function ManualEntryPage() {
  const { lang } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [date, setDate] = useState<Date>(new Date());
  const [category, setCategory] = useState<Category>("other");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [expenseType, setExpenseType] = useState<"personal" | "business">("personal");

  // Golf sub-fields
  const [greenFee, setGreenFee] = useState("");
  const [caddyFee, setCaddyFee] = useState("");
  const [golfTip, setGolfTip] = useState("");
  const [lessonFee, setLessonFee] = useState("");

  // Golf bet fields
  const [betResult, setBetResult] = useState<"none" | "win" | "loss">("none");
  const [betAmount, setBetAmount] = useState("");

  const handleSave = async () => {
    if (!user) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error(t("enterAmount", lang));
      return;
    }

    setSaving(true);
    try {
      const insertData: any = {
        user_id: user.id,
        amount: numAmount,
        recipient: memo.trim() || t("manualEntry", lang),
        category,
        date: format(date, "yyyy-MM-dd"),
        payment_method: paymentMethod,
        expense_type: expenseType,
      };

      if (category === "golf") {
        insertData.golf_green_fee = parseFloat(greenFee) || 0;
        insertData.golf_caddy_fee = parseFloat(caddyFee) || 0;
        insertData.golf_tip = parseFloat(golfTip) || 0;
        insertData.golf_lesson_fee = parseFloat(lessonFee) || 0;
        insertData.golf_bet_result = betResult;
        insertData.golf_bet_amount = parseFloat(betAmount) || 0;
      }

      const { error } = await supabase.from("expenses").insert(insertData);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(t("savedSuccess", lang));
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-4 pb-24 animate-slide-up">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-xl bg-secondary p-2">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-bold text-foreground">
          {t("addExpense", lang)}
        </h2>
      </div>

      <div className="space-y-5">
        {/* Expense Type Toggle */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {expenseType === "business" ? (
                <Briefcase className="h-4 w-4 text-primary" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-foreground">
                {expenseType === "business" ? t("businessExpense", lang) : t("personalExpense", lang)}
              </span>
            </div>
            <Switch
              checked={expenseType === "business"}
              onCheckedChange={(checked) => setExpenseType(checked ? "business" : "personal")}
            />
          </div>
        </div>

        {/* Amount */}
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("amount", lang)}
          </label>
          <div className="flex items-center justify-center gap-1">
            <span className="text-2xl font-bold text-muted-foreground">฿</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-48 bg-transparent text-center text-3xl font-bold text-foreground outline-none placeholder:text-muted-foreground/40"
              autoFocus
            />
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">
            {t("paymentMethod", lang)}
          </label>
          <div className="flex gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.key}
                onClick={() => setPaymentMethod(pm.key)}
                className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                  paymentMethod === pm.key
                    ? "gradient-primary text-primary-foreground shadow-primary"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {t(pm.tKey, lang)}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">
            {lang === "th" ? "วันที่" : "Date"}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                {format(date, "yyyy-MM-dd")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>

        {/* Category */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">
            {lang === "th" ? "หมวดหมู่" : "Category"}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => {
              const cfg = CATEGORY_MAP[cat];
              const Icon = cfg.icon;
              const active = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] font-medium transition-all ${
                    active ? "ring-2 ring-primary bg-primary/10 text-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" style={{ color: cfg.color }} />
                  {cfg.label[lang]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Golf Sub-fields */}
        {category === "golf" && (
          <div className="rounded-2xl border-2 border-green-500/30 bg-green-50/5 p-4 space-y-3">
            <p className="text-xs font-semibold text-green-600">
              {lang === "th" ? "รายละเอียดกอล์ฟ" : "Golf Details"}
            </p>
            {[
              { label: lang === "th" ? "กรีนฟี" : "Green Fee", value: greenFee, set: setGreenFee },
              { label: lang === "th" ? "แคดดี้" : "Caddy Fee", value: caddyFee, set: setCaddyFee },
              { label: lang === "th" ? "ทิป" : "Tips", value: golfTip, set: setGolfTip },
              { label: lang === "th" ? "เรียนกอล์ฟ" : "Lesson Fee", value: lessonFee, set: setLessonFee },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="w-20 text-xs text-muted-foreground">{f.label}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder="0"
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground text-right outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}

            {/* Golf Bet Tracker */}
            <div className="mt-2 pt-3 border-t border-border/50">
              <p className="text-xs font-semibold text-green-600 mb-2">
                {lang === "th" ? "ผลการเดิมพัน" : "Bet Result"}
              </p>
              <div className="flex gap-2 mb-2">
                {([
                  { key: "none" as const, th: "ไม่มี", en: "None" },
                  { key: "win" as const, th: "ชนะ 🏆", en: "Win 🏆" },
                  { key: "loss" as const, th: "แพ้ 😢", en: "Loss 😢" },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setBetResult(opt.key)}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                      betResult === opt.key
                        ? opt.key === "win" ? "bg-green-500 text-white" : opt.key === "loss" ? "bg-destructive text-destructive-foreground" : "gradient-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {lang === "th" ? opt.th : opt.en}
                  </button>
                ))}
              </div>
              {betResult !== "none" && (
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">
                    {lang === "th" ? "จำนวนเงิน" : "Amount"}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="0"
                    className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground text-right outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Memo */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">
            {lang === "th" ? "บันทึก / ชื่อร้าน" : "Memo / Store Name"}
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder={lang === "th" ? "เช่น ข้าวมันไก่, Grab..." : "e.g. Lunch, Grab..."}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || !amount}
          className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-primary transition-transform active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {lang === "th" ? "กำลังบันทึก..." : "Saving..."}
            </>
          ) : (
            lang === "th" ? "บันทึกรายจ่าย" : "Save Expense"
          )}
        </button>
      </div>
    </div>
  );
}
