import type { Lang } from "./i18n";

/**
 * Generate a "lucky fortune score" (1-100) from a reference number string.
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
  ko: string;
  ja: string;
  emoji: string;
}

const FORTUNE_MESSAGES: { min: number; max: number; msg: FortuneMessage }[] = [
  { min: 1, max: 20, msg: { th: "วันนี้ควรประหยัดหน่อยนะ! 💸", en: "Save your money today! 💸", ko: "오늘은 절약하세요! 💸", ja: "今日は節約しましょう！💸", emoji: "😰" } },
  { min: 21, max: 40, msg: { th: "ระวังรายจ่ายที่ไม่จำเป็น!", en: "Watch out for unnecessary spending!", ko: "불필요한 지출을 조심하세요!", ja: "無駄遣いに注意！", emoji: "🤔" } },
  { min: 41, max: 60, msg: { th: "การเงินปกติดี ทำต่อไป!", en: "Finances looking steady, keep going!", ko: "재정 상태 양호, 계속 파이팅!", ja: "財政は安定、その調子で！", emoji: "😊" } },
  { min: 61, max: 80, msg: { th: "โชคดี! อาจมีรายได้พิเศษเข้ามา 🎉", en: "Lucky! A bonus might come your way 🎉", ko: "행운! 보너스가 올 수 있어요 🎉", ja: "ラッキー！ボーナスが来るかも 🎉", emoji: "🍀" } },
  { min: 81, max: 100, msg: { th: "โชคลาภก้อนใหญ่กำลังมา! 💰🎊", en: "Big fortune is heading your way! 💰🎊", ko: "큰 행운이 다가오고 있어요! 💰🎊", ja: "大きな幸運が来ます！💰🎊", emoji: "🔥" } },
];

export function getFortuneMessage(score: number, lang: Lang): { text: string; emoji: string } {
  const entry = FORTUNE_MESSAGES.find((m) => score >= m.min && score <= m.max) ?? FORTUNE_MESSAGES[2];
  return { text: entry.msg[lang] ?? entry.msg.en, emoji: entry.msg.emoji };
}

export function getFortuneColor(score: number): string {
  if (score <= 20) return "#EF4444";
  if (score <= 40) return "#F97316";
  if (score <= 60) return "#FACC15";
  if (score <= 80) return "#22C55E";
  return "#8B5CF6";
}
