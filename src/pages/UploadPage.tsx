import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle2, Image as ImageIcon, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ExtractedSlipData {
  recipient: string;
  amount: number;
  date: string;
  ref_no: string;
  category: string;
}

export default function UploadPage() {
  const { lang } = useApp();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "done">("idle");
  const [extracted, setExtracted] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedSlipData[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setStatus("idle");
      setExtractedData([]);
    }
  };

  const handleAnalyze = async () => {
    if (!user) return;
    setStatus("uploading");
    setExtracted(0);
    setExtractedData([]);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Upload image to Storage
        const filePath = `${user.id}/${Date.now()}-${i}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("slips")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("slips")
          .getPublicUrl(filePath);

        // 2. Insert into slips table
        const { data: slipData, error: slipError } = await supabase
          .from("slips")
          .insert({
            user_id: user.id,
            image_url: urlData.publicUrl,
            storage_path: filePath,
            is_processed: false,
          })
          .select()
          .single();

        if (slipError) throw slipError;

        setStatus("analyzing");

        // 3. Call AI analyze-slip edge function
        const { data: aiResult, error: fnError } = await supabase.functions.invoke("analyze-slip", {
          body: { imageUrl: urlData.publicUrl },
        });

        if (fnError) throw new Error(fnError.message || "AI analysis failed");
        if (aiResult?.error) throw new Error(aiResult.error);

        // 4. Insert into expenses table
        const { error: expenseError } = await supabase
          .from("expenses")
          .insert({
            user_id: user.id,
            slip_id: slipData.id,
            amount: aiResult.amount,
            recipient: aiResult.recipient,
            category: aiResult.category,
            date: aiResult.date,
            ref_no: aiResult.ref_no,
          } as any);

        if (expenseError) throw expenseError;

        // 5. Mark slip as processed
        await supabase
          .from("slips")
          .update({ is_processed: true })
          .eq("id", slipData.id);

        setExtracted(i + 1);
        setExtractedData((prev) => [
          ...prev,
          {
            recipient: aiResult.recipient,
            amount: aiResult.amount,
            date: aiResult.date,
            ref_no: aiResult.ref_no,
            category: aiResult.category,
          },
        ]);
      }

      setStatus("done");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["slips"] });
      toast.success(
        lang === "th"
          ? `วิเคราะห์สำเร็จ ${files.length} สลิป`
          : `Successfully analyzed ${files.length} slips`
      );
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setStatus("idle");
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24 animate-slide-up">
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-primary">
          <Upload className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="text-lg font-bold text-foreground">{t("uploadSlips", lang)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("uploadDesc", lang)}</p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="hidden"
        />

        <button
          onClick={() => inputRef.current?.click()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-primary transition-transform active:scale-95"
        >
          <ImageIcon className="h-4 w-4" />
          {t("selectImages", lang)}
        </button>
      </div>

      {files.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="h-full w-full object-cover"
                />
                {(status === "analyzing" || status === "done") && i < extracted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/60">
                    <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {status === "idle" && (
            <button
              onClick={handleAnalyze}
              className="flex w-full items-center justify-center gap-2 rounded-xl gradient-gold py-3 text-sm font-bold text-accent-foreground shadow-gold transition-transform active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              {lang === "th" ? "AI วิเคราะห์สลิป" : "AI Analyze Slips"} ({files.length} {t("slips", lang)})
            </button>
          )}

          {(status === "uploading" || status === "analyzing") && (
            <div className="space-y-3">
              {/* AI Analyzing Animation */}
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {lang === "th" ? "AI กำลังวิเคราะห์สลิป..." : "AI is analyzing your slips..."}
                </p>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full gradient-primary transition-all duration-500"
                  style={{ width: `${(extracted / files.length) * 100}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {status === "uploading" && extracted === 0 ? (
                  <span className="flex items-center justify-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {lang === "th" ? "กำลังอัปโหลด..." : "Uploading..."}
                  </span>
                ) : (
                  <>{t("analyzing", lang)} {extracted}/{files.length}</>
                )}
              </p>

              {extractedData.length > 0 && (
                <div className="space-y-1.5">
                  {extractedData.map((d, i) => (
                    <ExtractedItem key={i} data={d} />
                  ))}
                </div>
              )}
            </div>
          )}

          {status === "done" && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-semibold">{t("analysisComplete", lang)}</span>
              </div>
              <div className="space-y-1.5">
                {extractedData.map((d, i) => (
                  <ExtractedItem key={i} data={d} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExtractedItem({ data }: { data: ExtractedSlipData }) {
  return (
    <div className="rounded-lg bg-purple-light px-3 py-2 animate-slide-up space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground truncate mr-2">{data.recipient}</span>
        <span className="text-xs font-semibold text-primary whitespace-nowrap">฿{data.amount.toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{data.date}</span>
        <span>Ref: {data.ref_no}</span>
      </div>
    </div>
  );
}
