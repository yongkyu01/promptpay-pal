import {
  UtensilsCrossed,
  ShoppingCart,
  Car,
  CircleDot,
  Zap,
  Coffee,
  Flower2,
  Store,
  TrendingUp,
  ArrowLeftRight,
  Plane,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { Lang } from "./i18n";

export const CATEGORIES = [
  "food", "shopping", "transport", "golf", "bills", "cafe",
  "wellness", "grocery", "investment", "transfer", "travel", "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface CategoryConfig {
  key: Category;
  icon: LucideIcon;
  color: string;
  label: Record<Lang, string>;
}

export const CATEGORY_MAP: Record<Category, CategoryConfig> = {
  food:       { key: "food",       icon: UtensilsCrossed, color: "#F97316", label: { th: "อาหาร", en: "Food", ko: "식비", ja: "食費" } },
  shopping:   { key: "shopping",   icon: ShoppingCart,    color: "#EC4899", label: { th: "ช้อปปิ้ง", en: "Shopping", ko: "쇼핑", ja: "ショッピング" } },
  transport:  { key: "transport",  icon: Car,             color: "#3B82F6", label: { th: "ค่าเดินทาง", en: "Transport", ko: "교통", ja: "交通費" } },
  golf:       { key: "golf",       icon: CircleDot,       color: "#22C55E", label: { th: "กอล์ฟ", en: "Golf", ko: "골프", ja: "ゴルフ" } },
  bills:      { key: "bills",      icon: Zap,             color: "#FACC15", label: { th: "ค่าน้ำค่าไฟ", en: "Bills", ko: "공과금", ja: "光熱費" } },
  cafe:       { key: "cafe",       icon: Coffee,          color: "#A16207", label: { th: "คาเฟ่", en: "Cafe", ko: "카페", ja: "カフェ" } },
  wellness:   { key: "wellness",   icon: Flower2,         color: "#14B8A6", label: { th: "สุขภาพ/สปา", en: "Wellness", ko: "웰니스", ja: "ウェルネス" } },
  grocery:    { key: "grocery",    icon: Store,           color: "#06B6D4", label: { th: "ซูเปอร์มาร์เก็ต", en: "Grocery", ko: "마트", ja: "スーパー" } },
  investment: { key: "investment", icon: TrendingUp,      color: "#8B5CF6", label: { th: "ลงทุน", en: "Investment", ko: "투자", ja: "投資" } },
  transfer:   { key: "transfer",   icon: ArrowLeftRight,  color: "#6366F1", label: { th: "โอนเงิน", en: "Transfer", ko: "송금", ja: "送金" } },
  travel:     { key: "travel",     icon: Plane,           color: "#0EA5E9", label: { th: "ท่องเที่ยว", en: "Travel", ko: "여행", ja: "旅行" } },
  other:      { key: "other",      icon: MoreHorizontal,  color: "#6B7280", label: { th: "อื่นๆ", en: "Other", ko: "기타", ja: "その他" } },
};

export function getCategoryLabel(cat: Category, lang: Lang): string {
  return CATEGORY_MAP[cat]?.label[lang] ?? CATEGORY_MAP[cat]?.label.en ?? cat;
}

export function getCategoryColor(cat: string): string {
  return CATEGORY_MAP[cat as Category]?.color ?? CATEGORY_MAP.other.color;
}

export function getCategoryIcon(cat: string): LucideIcon {
  return CATEGORY_MAP[cat as Category]?.icon ?? CATEGORY_MAP.other.icon;
}
