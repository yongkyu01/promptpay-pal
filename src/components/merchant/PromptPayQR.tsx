import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import generatePayload from "promptpay-qr";
import { QrCode, Check } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function PromptPayQR() {
  const { lang } = useApp();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [promptPayId, setPromptPayId] = useState("");
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const labels = {
    title: { th: "สร้าง QR รับเงิน", en: "Generate Payment QR", ko: "결제 QR 생성", ja: "決済QR生成" },
    ppId: { th: "เบอร์พร้อมเพย์ / เลขบัตรประชาชน", en: "PromptPay ID (Phone / National ID)", ko: "PromptPay ID (전화번호/주민번호)", ja: "PromptPay ID（電話/国民ID）" },
    ppPlaceholder: { th: "เช่น 0812345678", en: "e.g. 0812345678", ko: "예: 0812345678", ja: "例: 0812345678" },
    amountLabel: { th: "จำนวนเงิน (บาท)", en: "Amount (THB)", ko: "금액 (바트)", ja: "金額（バーツ）" },
    generate: { th: "สร้าง QR Code", en: "Generate QR Code", ko: "QR 코드 생성", ja: "QRコード生成" },
    scanToPay: { th: "สแกนเพื่อชำระเงิน", en: "Scan to Pay", ko: "스캔하여 결제", ja: "スキャンして支払い" },
    newQr: { th: "สร้าง QR ใหม่", en: "New QR", ko: "새 QR", ja: "新しいQR" },
    waiting: { th: "รอการชำระเงิน...", en: "Waiting for payment...", ko: "결제 대기 중...", ja: "決済待ち..." },
  };

  const l = (key: keyof typeof labels) => labels[key][lang] || labels[key]["en"];

  const handleGenerate = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error(t("enterAmount", lang));
      return;
    }
    if (!promptPayId.trim()) {
      toast.error(l("ppId"));
      return;
    }

    // Generate PromptPay QR payload
    const payload = generatePayload(promptPayId.trim(), { amount: amt });
    setQrPayload(payload);
    setSaved(false);

    // Save pending payment
    if (user) {
      await supabase.from("pending_payments").insert({
        user_id: user.id,
        amount: amt,
        promptpay_id: promptPayId.trim(),
        status: "pending",
      } as any);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["pending_payments"] });
    }
  };

  const handleReset = () => {
    setQrPayload(null);
    setAmount("");
    setSaved(false);
  };

  if (qrPayload) {
    return (
      <div className="rounded-2xl border border-amber-200/30 bg-card p-6 text-center space-y-4 animate-slide-up">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-gold">
          <QrCode className="h-6 w-6 text-white" />
        </div>
        <p className="text-sm font-semibold text-foreground">{l("scanToPay")}</p>
        <p className="text-2xl font-bold text-amber-600">฿{parseFloat(amount).toLocaleString()}</p>

        <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-lg">
          <QRCodeSVG value={qrPayload} size={220} level="M" />
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          {saved && <Check className="h-3.5 w-3.5 text-green-500" />}
          <span>{l("waiting")}</span>
        </div>

        <button
          onClick={handleReset}
          className="w-full rounded-xl border border-amber-200/30 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
        >
          {l("newQr")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200/30 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <QrCode className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-foreground">{l("title")}</h2>
      </div>

      <input
        type="text"
        inputMode="tel"
        placeholder={l("ppPlaceholder")}
        value={promptPayId}
        onChange={(e) => setPromptPayId(e.target.value)}
        className="w-full rounded-xl border border-amber-200/30 bg-secondary/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
      />

      <input
        type="number"
        inputMode="decimal"
        placeholder={l("amountLabel")}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full rounded-xl border border-amber-200/30 bg-secondary/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
      />

      <button
        onClick={handleGenerate}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 py-3 text-sm font-bold text-white shadow-gold transition-transform active:scale-95"
      >
        <QrCode className="h-4 w-4" />
        {l("generate")}
      </button>
    </div>
  );
}
