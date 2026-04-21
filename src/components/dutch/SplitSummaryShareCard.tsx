import { useMemo, useRef, useState } from "react";
import { Download, MessageCircleMore, MessagesSquare } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { t, type Lang } from "@/lib/i18n";

interface ShareMember {
  id: string;
  name: string;
  amount: number;
  isOwner?: boolean;
}

interface SplitSummaryShareCardProps {
  lang: Lang;
  title: string;
  place?: string | null;
  total: number;
  subtotal: number;
  vat: number;
  serviceCharge: number;
  members: ShareMember[];
}

export default function SplitSummaryShareCard({
  lang,
  title,
  place,
  total,
  subtotal,
  vat,
  serviceCharge,
  members,
}: SplitSummaryShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busyTarget, setBusyTarget] = useState<"download" | "line" | "kakao" | null>(null);

  const fileName = useMemo(() => {
    const safeTitle = title.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/gi, "-").replace(/(^-|-$)/g, "") || "dutch-summary";
    return `${safeTitle}.png`;
  }, [title]);

  const shareText = useMemo(() => {
    const lines = [
      `💸 ${title}`,
      place ? `📍 ${place}` : null,
      `${t("total", lang)}: ฿${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      ...members.map((member) => `• ${member.name}${member.isOwner ? " 👑" : ""}: ฿${member.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`),
    ].filter(Boolean);

    return lines.join("\n");
  }, [lang, members, place, title, total]);

  const createImageFile = async () => {
    if (!cardRef.current) {
      throw new Error(t("shareCardUnavailable", lang));
    }

    const dataUrl = await toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "hsl(var(--background))",
    });

    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], fileName, { type: "image/png" });
  };

  const downloadImage = async () => {
    setBusyTarget("download");
    try {
      const file = await createImageFile();
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("pngSaved", lang));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("shareFailed", lang));
    } finally {
      setBusyTarget(null);
    }
  };

  const shareToApp = async (target: "line" | "kakao") => {
    setBusyTarget(target);
    try {
      const file = await createImageFile();

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: shareText,
        });
        toast.success(target === "line" ? t("lineShareReady", lang) : t("kakaoShareReady", lang));
        return;
      }

      await navigator.clipboard.writeText(shareText);

      if (target === "line") {
        window.open(`https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
      }

      toast.success(t("shareFallback", lang));
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : t("shareFailed", lang));
    } finally {
      setBusyTarget(null);
    }
  };

  return (
    <div className="space-y-3">
      <div
        ref={cardRef}
        className="overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-primary"
      >
        <div className="rounded-[1.25rem] bg-gradient-to-br from-primary/95 via-primary to-accent p-5 text-primary-foreground">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-primary-foreground/80">Dutch-Dee</p>
              <h3 className="mt-1 text-xl font-bold">{title}</h3>
              {place ? <p className="mt-1 text-sm text-primary-foreground/80">{place}</p> : null}
            </div>
            <div className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold">
              {t("finalizedTitle", lang)}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Metric label={t("subtotal", lang)} value={subtotal} />
            <Metric label={t("vat", lang)} value={vat} />
            <Metric label={t("serviceCharge", lang)} value={serviceCharge} />
          </div>

          <div className="mt-4 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary-foreground/80">{t("total", lang)}</span>
              <span className="text-2xl font-bold">฿{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2"
              >
                <span className="text-sm font-medium">
                  {member.name}
                  {member.isOwner ? " 👑" : ""}
                </span>
                <span className="text-sm font-bold">฿{member.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" onClick={downloadImage} disabled={busyTarget !== null} className="h-11 rounded-2xl">
          <Download className="h-4 w-4" />
          {busyTarget === "download" ? t("saving", lang) : t("savePng", lang)}
        </Button>
        <Button variant="outline" onClick={() => shareToApp("line")} disabled={busyTarget !== null} className="h-11 rounded-2xl">
          <MessageCircleMore className="h-4 w-4" />
          LINE
        </Button>
        <Button variant="outline" onClick={() => shareToApp("kakao")} disabled={busyTarget !== null} className="h-11 rounded-2xl">
          <MessagesSquare className="h-4 w-4" />
          Kakao
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 px-2 py-3">
      <p className="text-[11px] text-primary-foreground/75">{label}</p>
      <p className="mt-1 text-sm font-bold">฿{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
    </div>
  );
}