import { generateFortuneScore, getFortuneMessage, getFortuneColor } from "@/lib/fortuneScore";
import { Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";

interface FortuneScoreCardProps {
  refNo: string;
  compact?: boolean;
}

export default function FortuneScoreCard({ refNo, compact }: FortuneScoreCardProps) {
  const { lang } = useApp();
  const score = generateFortuneScore(refNo);
  const { text, emoji } = getFortuneMessage(score, lang);
  const color = getFortuneColor(score);

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: color + "15" }}>
        <span className="text-lg">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground">{t("fortuneScore", lang)}</p>
          <p className="text-sm font-bold" style={{ color }}>{score}/100</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 animate-scale-in">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4" style={{ color }} />
        <h3 className="text-sm font-semibold text-foreground">{t("fortuneToday", lang)}</h3>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 items-center justify-center flex-shrink-0">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 213.6} 213.6`}
              className="transition-all duration-1000"
            />
          </svg>
          <span className="text-xl font-extrabold" style={{ color }}>{score}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-2xl mb-1">{emoji}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}
