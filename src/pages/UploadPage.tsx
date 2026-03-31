import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";
import { mockAiProcessor } from "@/lib/mockData";
import { Upload, CheckCircle2, Image as ImageIcon, Sparkles } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

export default function UploadPage() {
  const { lang, addSlips } = useApp();
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "analyzing" | "done">("idle");
  const [extracted, setExtracted] = useState(0);
  const [extractedData, setExtractedData] = useState<Array<{ recipient: string; amount: number }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setStatus("idle");
      setExtractedData([]);
    }
  };

  const handleAnalyze = async () => {
    setStatus("analyzing");
    setExtracted(0);
    setExtractedData([]);

    const results = [];
    for (let i = 0; i < files.length; i++) {
      const slip = await mockAiProcessor(files[i], i);
      results.push(slip);
      setExtracted(i + 1);
      setExtractedData((prev) => [...prev, { recipient: slip.recipient, amount: slip.amount }]);
    }

    addSlips(results);
    setStatus("done");
    toast.success(
      lang === "th"
        ? `วิเคราะห์สำเร็จ ${results.length} สลิป`
        : `Successfully analyzed ${results.length} slips`
    );
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
          {/* Preview grid */}
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

          {status === "analyzing" && (
            <div className="space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full gradient-primary transition-all duration-500"
                  style={{ width: `${(extracted / files.length) * 100}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {t("analyzing", lang)} {extracted}/{files.length}
              </p>
              {/* Live extraction results */}
              {extractedData.length > 0 && (
                <div className="space-y-1.5">
                  {extractedData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-purple-light px-3 py-2 animate-slide-up">
                      <span className="text-xs font-medium text-foreground truncate mr-2">{d.recipient}</span>
                      <span className="text-xs font-semibold text-primary whitespace-nowrap">฿{d.amount.toLocaleString()}</span>
                    </div>
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
              {/* Final extraction summary */}
              <div className="space-y-1.5">
                {extractedData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-purple-light px-3 py-2">
                    <span className="text-xs font-medium text-foreground truncate mr-2">{d.recipient}</span>
                    <span className="text-xs font-semibold text-primary whitespace-nowrap">฿{d.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
