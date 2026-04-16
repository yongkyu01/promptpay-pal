import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ScanLine, CheckCircle2, AlertTriangle, Loader2, Upload } from "lucide-react";
import { fireConfetti } from "@/lib/confetti";
import RegularCustomerCoupon from "@/components/merchant/RegularCustomerCoupon";

interface ScanResult {
  sender_name: string;
  amount: number;
  date: string;
  ref_no: string;
  is_valid_slip: boolean;
}

export default function MerchantScanPage() {
  const { lang } = useApp();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [customerVisitCount, setCustomerVisitCount] = useState(0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setStatus("idle");
      setResult(null);
      setIsDuplicate(false);
    }
  };

  const handleScan = async () => {
    if (!file || !user) return;
    setStatus("scanning");

    try {
      // Upload image
      const filePath = `merchant/${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("slips").upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("slips").getPublicUrl(filePath);

      // AI analyze
      const { data: aiResult, error: fnErr } = await supabase.functions.invoke("analyze-slip", {
        body: { imageUrl: urlData.publicUrl },
      });
      if (fnErr) throw new Error(fnErr.message || "Analysis failed");
      if (aiResult?.error) throw new Error(aiResult.error);

      if (!aiResult.is_valid_slip) {
        toast.error(
          lang === "th" ? "ไม่ใช่สลิปที่ถูกต้อง" :
          lang === "ko" ? "유효하지 않은 영수증입니다" :
          lang === "ja" ? "有効なレシートではありません" :
          "Not a valid payment slip"
        );
        await supabase.storage.from("slips").remove([filePath]);
        setStatus("error");
        return;
      }

      // Check duplicate ref_no in sales
      if (aiResult.ref_no) {
        const { data: existing } = await supabase
          .from("sales")
          .select("id")
          .eq("ref_no", aiResult.ref_no)
          .eq("user_id", user.id)
          .limit(1);

        if (existing && existing.length > 0) {
          setIsDuplicate(true);
          setResult(aiResult);
          setStatus("done");
          toast.warning(t("alreadyProcessed", lang));
          await supabase.storage.from("slips").remove([filePath]);
          return;
        }
      }

      // Record as sale
      await supabase.from("sales").insert({
        user_id: user.id,
        amount: aiResult.amount,
        sender_name: aiResult.recipient || "",
        ref_no: aiResult.ref_no || null,
        date: aiResult.date,
        time: aiResult.time || null,
        image_url: urlData.publicUrl,
        storage_path: filePath,
        is_verified: true,
      } as any);

      setResult(aiResult);
      setStatus("done");
      setIsDuplicate(false);

      // Check visit count for this customer
      const senderName = (aiResult.recipient || aiResult.sender_name || "").trim();
      if (senderName) {
        const { data: allSales } = await supabase
          .from("sales")
          .select("id")
          .eq("user_id", user.id)
          .eq("sender_name", senderName);
        setCustomerVisitCount(allSales?.length || 0);
      }

      fireConfetti();
      toast.success(t("paymentConfirmed", lang));
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    } catch (err: any) {
      toast.error(err.message || "Scan failed");
      setStatus("error");
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24 animate-slide-up">
      <div className="rounded-2xl border border-amber-200/30 bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-gold">
          <ScanLine className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-lg font-bold text-foreground">{t("scanSlip", lang)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("scanDesc", lang)}</p>

        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

        <button
          onClick={() => inputRef.current?.click()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 px-6 py-3 text-sm font-semibold text-white shadow-gold transition-transform active:scale-95"
        >
          <Upload className="h-4 w-4" />
          {t("selectImages", lang)}
        </button>
      </div>

      {file && (
        <div className="rounded-2xl border border-amber-200/30 bg-card p-4 space-y-4">
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-secondary">
            <img src={URL.createObjectURL(file)} alt="slip" className="h-full w-full object-contain" />
          </div>

          {status === "idle" && (
            <button
              onClick={handleScan}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 py-3 text-sm font-bold text-white shadow-gold transition-transform active:scale-95"
            >
              <ScanLine className="h-4 w-4" />
              {t("verifyPayment", lang)}
            </button>
          )}

          {status === "scanning" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                <ScanLine className="h-5 w-5 text-amber-500 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {lang === "th" ? "กำลังตรวจสอบ..." :
                 lang === "ko" ? "확인 중..." :
                 lang === "ja" ? "確認中..." :
                 "Verifying..."}
              </p>
            </div>
          )}

          {status === "done" && result && (
            <div className="space-y-3 animate-slide-up">
              {isDuplicate ? (
                <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4">
                  <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">{t("alreadyProcessed", lang)}</p>
                    <p className="text-xs text-muted-foreground">Ref: {result.ref_no}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-700">{t("paymentConfirmed", lang)}</p>
                    <p className="text-xs text-muted-foreground">Ref: {result.ref_no}</p>
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-secondary/50 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t("receiver", lang)}</span>
                  <span className="text-sm font-medium text-foreground">{result.sender_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t("amount", lang)}</span>
                  <span className="text-sm font-bold text-amber-600">฿{Number(result.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t("date", lang)}</span>
                  <span className="text-sm text-foreground">{result.date}</span>
                </div>
              </div>

              <button
                onClick={() => { setFile(null); setResult(null); setStatus("idle"); setIsDuplicate(false); setCustomerVisitCount(0); }}
                className="w-full rounded-xl border border-amber-200/30 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                {lang === "th" ? "สแกนสลิปถัดไป" :
                 lang === "ko" ? "다음 영수증 스캔" :
                 lang === "ja" ? "次のレシートをスキャン" :
                 "Scan Next Slip"}
              </button>
              {/* Regular customer coupon */}
              {!isDuplicate && customerVisitCount >= 5 && result && (
                <RegularCustomerCoupon
                  customerName={result.sender_name}
                  visitCount={customerVisitCount}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
