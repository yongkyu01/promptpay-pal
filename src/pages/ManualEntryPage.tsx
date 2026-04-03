import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarIcon, Loader2 } from "lucide-react";
import { CATEGORIES, CATEGORY_MAP, type Category } from "@/lib/categories";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const PAYMENT_METHODS = [
  { key: "promptpay", th: "พร้อมเพย์", en: "PromptPay" },
  { key: "cash", th: "เงินสด", en: "Cash" },
  { key: "bank_transfer", th: "โอนเงิน", en: "Bank Transfer" },
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

  const handleSave = async () => {
    if (!user) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error(lang === "th" ? "กรุณาใส่จำนวนเงิน" : "Please enter an amount");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        amount: numAmount,
        recipient: memo.trim() || (lang === "th" ? "บันทึกเอง" : "Manual entry"),
        category,
        date: format(date, "yyyy-MM-dd"),
        payment_method: paymentMethod,
      } as any);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(lang === "th" ? "บันทึกสำเร็จ!" : "Saved successfully!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-4 pb-24 animate-slide-up">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-xl bg-secondary p-2">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-bold text-foreground">
          {lang === "th" ? "บันทึกรายจ่าย" : "Add Expense"}
        </h2>
      </div>

      <div className="space-y-5">
        {/* Amount */}
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {lang === "th" ? "จำนวนเงิน (บาท)" : "Amount (THB)"}
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
            {lang === "th" ? "วิธีชำระเงิน" : "Payment Method"}
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
                {lang === "th" ? pm.th : pm.en}
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
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
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
                    active
                      ? "ring-2 ring-primary bg-primary/10 text-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" style={{ color: cfg.color }} />
                  {lang === "th" ? cfg.labelTh : cfg.labelEn}
                </button>
              );
            })}
          </div>
        </div>

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
