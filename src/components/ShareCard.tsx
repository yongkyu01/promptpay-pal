import { useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Share2, Download, X } from "lucide-react";
import { generateFortuneScore, getFortuneMessage, getFortuneColor } from "@/lib/fortuneScore";

interface ShareCardProps {
  totalSpending: number;
  slipCount: number;
  topCategory?: { name: string; amount: number };
  refNo?: string;
}

export default function ShareCardButton({ totalSpending, slipCount, topCategory, refNo }: ShareCardProps) {
  const { lang } = useApp();
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fortune = refNo ? generateFortuneScore(refNo) : Math.floor(Math.random() * 100) + 1;
  const fortuneMsg = getFortuneMessage(fortune, lang);
  const fortuneColor = getFortuneColor(fortune);

  const generateCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 540, h = 960;
    canvas.width = w;
    canvas.height = h;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#1e1b4b");
    grad.addColorStop(0.5, "#312e81");
    grad.addColorStop(1, "#4c1d95");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Decorative circles
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.15, 200, 0, Math.PI * 2);
    ctx.fillStyle = "#a78bfa";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w * 0.2, h * 0.85, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // App name
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PromptPay Buddy", w / 2, 60);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 28px Inter, Noto Sans Thai, sans-serif";
    ctx.fillText(lang === "th" ? "สรุปค่าใช้จ่าย" : "Spending Summary", w / 2, 130);

    // Total amount card
    const cardY = 180;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, 40, cardY, w - 80, 160, 20);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "500 14px Inter, sans-serif";
    ctx.fillText(lang === "th" ? "ยอดใช้จ่ายทั้งหมด" : "Total Spending", w / 2, cardY + 45);

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 48px Inter, sans-serif";
    ctx.fillText(`฿${totalSpending.toLocaleString()}`, w / 2, cardY + 105);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "500 14px Inter, sans-serif";
    ctx.fillText(`${slipCount} ${lang === "th" ? "รายการ" : "transactions"}`, w / 2, cardY + 140);

    // Top category
    if (topCategory) {
      const catY = 400;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(ctx, 40, catY, w - 80, 100, 20);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "500 13px Inter, sans-serif";
      ctx.fillText(lang === "th" ? "หมวดหมู่สูงสุด" : "Top Category", w / 2, catY + 35);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 22px Inter, Noto Sans Thai, sans-serif";
      ctx.fillText(`${topCategory.name} · ฿${topCategory.amount.toLocaleString()}`, w / 2, catY + 72);
    }

    // Fortune score
    const fY = 560;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, 40, fY, w - 80, 180, 20);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "500 13px Inter, sans-serif";
    ctx.fillText(lang === "th" ? "ดวงการเงิน" : "Fortune Score", w / 2, fY + 35);

    ctx.fillStyle = fortuneColor;
    ctx.font = "800 64px Inter, sans-serif";
    ctx.fillText(`${fortune}`, w / 2, fY + 105);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 14px Inter, Noto Sans Thai, sans-serif";
    ctx.fillText(`${fortuneMsg.emoji} ${fortuneMsg.text}`, w / 2, fY + 145);

    // Footer
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "400 12px Inter, sans-serif";
    ctx.fillText(new Date().toLocaleDateString(), w / 2, h - 40);

    setOpen(true);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "spending-card.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "spending-card.png", { type: "image/png" });
      if (navigator.share) {
        try {
          await navigator.share({ files: [file], title: "PromptPay Buddy" });
        } catch { /* user cancelled */ }
      } else {
        handleDownload();
      }
    });
  };

  return (
    <>
      <button
        onClick={generateCard}
        className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-xs font-semibold text-foreground transition-transform active:scale-95"
      >
        <Share2 className="h-4 w-4 text-primary" />
        {lang === "th" ? "แชร์การ์ด" : "Share Card"}
      </button>

      <canvas ref={canvasRef} className="hidden" />

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="relative max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} className="absolute -top-3 -right-3 rounded-full bg-secondary p-2 shadow-lg z-10">
              <X className="h-4 w-4 text-foreground" />
            </button>
            <img
              src={canvasRef.current?.toDataURL()}
              alt="Share card"
              className="w-full rounded-2xl shadow-2xl"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground transition-transform active:scale-95"
              >
                <Download className="h-4 w-4" />
                {lang === "th" ? "ดาวน์โหลด" : "Download"}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-primary transition-transform active:scale-95"
              >
                <Share2 className="h-4 w-4" />
                {lang === "th" ? "แชร์" : "Share"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
