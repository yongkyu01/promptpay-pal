import { getCategoryLabel, getCategoryColor, getCategoryIcon, type Category } from "@/lib/categories";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Share2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

interface Expense {
  id: string;
  recipient: string;
  amount: number;
  date: string;
  time: string | null;
  category: string;
  ref_no?: string | null;
  slip_id?: string | null;
}

interface Props {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  slipImageUrl?: string | null;
}

export default function ExpenseDetailSheet({ expense, open, onOpenChange, lang, slipImageUrl }: Props) {
  if (!expense) return null;

  const Icon = getCategoryIcon(expense.category);
  const color = getCategoryColor(expense.category);

  const shareText = [
    `💸 ${t("expense", lang)}`,
    `📍 ${expense.recipient}`,
    `💰 ฿${Number(expense.amount).toLocaleString()}`,
    `📅 ${expense.date}${expense.time ? ` ${expense.time}` : ""}`,
    `🏷️ ${getCategoryLabel(expense.category as Category, lang)}`,
    expense.ref_no ? `🔖 Ref: ${expense.ref_no}` : "",
  ].filter(Boolean).join("\n");

  const handleShareLine = () => {
    const encoded = encodeURIComponent(shareText);
    const lineUrl = `https://social-plugins.line.me/lineit/share?text=${encoded}`;
    window.open(lineUrl, "_blank", "noopener,noreferrer");
  };

  const handleWebShare = async () => {
    if (!navigator.share) {
      handleShareLine();
      return;
    }
    try {
      await navigator.share({ title: expense.recipient, text: shareText });
    } catch { /* cancelled */ }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">{t("detail", lang)}</SheetTitle>
        </SheetHeader>

        {slipImageUrl && (
          <div className="mb-4 overflow-hidden rounded-xl border border-border">
            <img src={slipImageUrl} alt="Slip" className="w-full max-h-48 object-contain bg-secondary" />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: color + "18" }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{expense.recipient}</p>
              <p className="text-xs text-muted-foreground">{getCategoryLabel(expense.category as Category, lang)}</p>
            </div>
            <p className="text-lg font-bold text-foreground">฿{Number(expense.amount).toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-3">
            <div>
              <p className="text-[10px] text-muted-foreground">{t("date", lang)}</p>
              <p className="text-xs font-medium text-foreground">{expense.date}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{t("time", lang)}</p>
              <p className="text-xs font-medium text-foreground">{expense.time || "-"}</p>
            </div>
            {expense.ref_no && (
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground">Ref No.</p>
                <p className="text-xs font-medium text-foreground font-mono">{expense.ref_no}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleShareLine}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-transform active:scale-95"
              style={{ background: "#06C755" }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              {t("shareViaLine", lang)}
            </button>

            {typeof navigator !== "undefined" && navigator.share && (
              <button
                onClick={handleWebShare}
                className="flex items-center justify-center rounded-xl border border-border bg-card px-4 py-3 transition-transform active:scale-95"
              >
                <Share2 className="h-5 w-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
