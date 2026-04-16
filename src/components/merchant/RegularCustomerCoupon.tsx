import { useState, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { t, Lang } from "@/lib/i18n";
import { Crown, Download, Share2, X, Gift } from "lucide-react";

interface RegularCustomerCouponProps {
  customerName: string;
  visitCount: number;
}

const couponText = (lang: Lang) => ({
  title: lang === "th" ? "🎉 ลูกค้าประจำ!" : lang === "ko" ? "🎉 단골 손님!" : lang === "ja" ? "🎉 リピーター！" : "🎉 Regular Customer!",
  desc: lang === "th" ? "ลูกค้าท่านนี้มาบ่อยมาก! ออกคูปองให้เลย" : lang === "ko" ? "이 고객은 자주 방문합니다! 쿠폰을 발행하세요" : lang === "ja" ? "このお客様は常連です！クーポンを発行しましょう" : "This customer visits often! Issue a coupon",
  issueCoupon: lang === "th" ? "ออกคูปองฟรี" : lang === "ko" ? "무료 쿠폰 발행" : lang === "ja" ? "無料クーポン発行" : "Issue Free Coupon",
  couponTitle: lang === "th" ? "ชาไทย 1 แก้วฟรี" : lang === "ko" ? "타이티 1잔 무료" : lang === "ja" ? "タイティー1杯無料" : "1 Free Thai Tea",
  thanksMsg: lang === "th" ? "ขอบคุณที่เป็นลูกค้าประจำของเรา!" : lang === "ko" ? "항상 방문해 주셔서 감사합니다!" : lang === "ja" ? "いつもご来店ありがとうございます！" : "Thank you for being our loyal customer!",
  validUntil: lang === "th" ? "ใช้ได้ถึง" : lang === "ko" ? "유효기간" : lang === "ja" ? "有効期限" : "Valid until",
  shareToLine: lang === "th" ? "ส่งทาง LINE" : lang === "ko" ? "LINE으로 전송" : lang === "ja" ? "LINEで送信" : "Share via LINE",
});

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

export default function RegularCustomerCoupon({ customerName, visitCount }: RegularCustomerCouponProps) {
  const { lang } = useApp();
  const [showCoupon, setShowCoupon] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const txt = couponText(lang);

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  const expiryStr = expiryDate.toLocaleDateString();

  const generateCoupon = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 540, h = 720;
    canvas.width = w;
    canvas.height = h;

    // Gold gradient background
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#1a1a2e");
    grad.addColorStop(0.5, "#16213e");
    grad.addColorStop(1, "#0f3460");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Decorative circles
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath(); ctx.arc(w * 0.9, h * 0.1, 120, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.1, h * 0.9, 100, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Gold border
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    roundRect(ctx, 20, 20, w - 40, h - 40, 24);
    ctx.stroke();

    // Inner card
    ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
    roundRect(ctx, 40, 40, w - 80, h - 80, 16);
    ctx.fill();

    // Crown emoji
    ctx.font = "64px serif";
    ctx.textAlign = "center";
    ctx.fillText("👑", w / 2, 120);

    // FREE COUPON header
    ctx.fillStyle = "#f59e0b";
    ctx.font = "800 28px Inter, sans-serif";
    ctx.fillText("FREE COUPON", w / 2, 170);

    // Dashed line
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = "rgba(245, 158, 11, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, 195); ctx.lineTo(w - 60, 195); ctx.stroke();
    ctx.setLineDash([]);

    // Coupon offer
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 32px Inter, Noto Sans Thai, sans-serif";
    ctx.fillText(txt.couponTitle, w / 2, 260);

    // Customer name
    ctx.fillStyle = "#f59e0b";
    ctx.font = "600 20px Inter, Noto Sans Thai, sans-serif";
    ctx.fillText(`🎖 ${customerName}`, w / 2, 320);

    // Visit count
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "500 14px Inter, Noto Sans Thai, sans-serif";
    ctx.fillText(`${visitCount} ${t("visits", lang)}`, w / 2, 355);

    // Thank you message
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 15px Inter, Noto Sans Thai, sans-serif";
    const lines = wrapText(ctx, txt.thanksMsg, w - 120);
    lines.forEach((line, i) => ctx.fillText(line, w / 2, 420 + i * 24));

    // Dashed line 2
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = "rgba(245, 158, 11, 0.3)";
    ctx.beginPath(); ctx.moveTo(60, 480); ctx.lineTo(w - 60, 480); ctx.stroke();
    ctx.setLineDash([]);

    // Expiry
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "400 13px Inter, Noto Sans Thai, sans-serif";
    ctx.fillText(`${txt.validUntil}: ${expiryStr}`, w / 2, 520);

    // Coupon code
    const code = `VIP-${customerName.slice(0, 3).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
    roundRect(ctx, w / 2 - 100, 545, 200, 40, 8);
    ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.font = "700 16px monospace";
    ctx.fillText(code, w / 2, 572);

    // Footer
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "400 11px Inter, sans-serif";
    ctx.fillText("Powered by Keb-Dee", w / 2, h - 50);

    setShowCoupon(true);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `coupon-${customerName}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShareLine = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `coupon-${customerName}.png`, { type: "image/png" });
      if (navigator.share) {
        try {
          await navigator.share({ files: [file], title: `Coupon for ${customerName}` });
        } catch { /* cancelled */ }
      } else {
        // Fallback to LINE share URL
        const dataUrl = canvas.toDataURL("image/png");
        const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(window.location.href)}`;
        window.open(lineUrl, "_blank");
      }
    });
  };

  return (
    <>
      {/* Alert banner */}
      <div className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
            <Crown className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-600">{txt.title}</p>
            <p className="text-xs text-muted-foreground">
              {customerName} · {visitCount} {t("visits", lang)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{txt.desc}</p>
          </div>
        </div>
        <button
          onClick={generateCoupon}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 py-2.5 text-sm font-bold text-white shadow-gold transition-transform active:scale-95"
        >
          <Gift className="h-4 w-4" />
          {txt.issueCoupon}
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Coupon modal */}
      {showCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4" onClick={() => setShowCoupon(false)}>
          <div className="relative max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowCoupon(false)} className="absolute -top-3 -right-3 rounded-full bg-secondary p-2 shadow-lg z-10">
              <X className="h-4 w-4 text-foreground" />
            </button>
            <img src={canvasRef.current?.toDataURL()} alt="Coupon" className="w-full rounded-2xl shadow-2xl" />
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground transition-transform active:scale-95"
              >
                <Download className="h-4 w-4" />
                {t("download", lang)}
              </button>
              <button
                onClick={handleShareLine}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#06C755] py-3 text-sm font-semibold text-white shadow-lg transition-transform active:scale-95"
              >
                <Share2 className="h-4 w-4" />
                {txt.shareToLine}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split("");
  const lines: string[] = [];
  let current = "";
  for (const char of words) {
    const test = current + char;
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
