/**
 * Generate a "lucky fortune score" (1-100) from a reference number string.
 * Uses a simple hash so the same ref_no always yields the same score.
 */
export function generateFortuneScore(refNo: string): number {
  let hash = 0;
  for (let i = 0; i < refNo.length; i++) {
    hash = ((hash << 5) - hash + refNo.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 100) + 1;
}

interface FortuneMessage {
  th: string;
  en: string;
  emoji: string;
}

const FORTUNE_MESSAGES: { min: number; max: number; msg: FortuneMessage }[] = [
  { min: 1, max: 20, msg: { th: "วันนี้ควรประหยัดหน่อยนะ! 💸", en: "Save your money today! 💸", emoji: "😰" } },
  { min: 21, max: 40, msg: { th: "ระวังรายจ่ายที่ไม่จำเป็น!", en: "Watch out for unnecessary spending!", emoji: "🤔" } },
  { min: 41, max: 60, msg: { th: "การเงินปกติดี ทำต่อไป!", en: "Finances looking steady, keep going!", emoji: "😊" } },
  { min: 61, max: 80, msg: { th: "โชคดี! อาจมีรายได้พิเศษเข้ามา 🎉", en: "Lucky! A bonus might come your way 🎉", emoji: "🍀" } },
  { min: 81, max: 100, msg: { th: "โชคลาภก้อนใหญ่กำลังมา! 💰🎊", en: "Big fortune is heading your way! 💰🎊", emoji: "🔥" } },
];

export function getFortuneMessage(score: number, lang: "th" | "en"): { text: string; emoji: string } {
  const entry = FORTUNE_MESSAGES.find((m) => score >= m.min && score <= m.max) ?? FORTUNE_MESSAGES[2];
  return { text: lang === "th" ? entry.msg.th : entry.msg.en, emoji: entry.msg.emoji };
}

export function getFortuneColor(score: number): string {
  if (score <= 20) return "#EF4444";
  if (score <= 40) return "#F97316";
  if (score <= 60) return "#FACC15";
  if (score <= 80) return "#22C55E";
  return "#8B5CF6";
}
