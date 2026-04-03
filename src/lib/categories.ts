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

export const CATEGORIES = [
  "food", "shopping", "transport", "golf", "bills", "cafe",
  "wellness", "grocery", "investment", "transfer", "travel", "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface CategoryConfig {
  key: Category;
  icon: LucideIcon;
  color: string;
  labelTh: string;
  labelEn: string;
}

export const CATEGORY_MAP: Record<Category, CategoryConfig> = {
  food:       { key: "food",       icon: UtensilsCrossed, color: "#F97316", labelTh: "อาหาร",         labelEn: "Food" },
  shopping:   { key: "shopping",   icon: ShoppingCart,    color: "#EC4899", labelTh: "ช้อปปิ้ง",       labelEn: "Shopping" },
  transport:  { key: "transport",  icon: Car,             color: "#3B82F6", labelTh: "ค่าเดินทาง",     labelEn: "Transport" },
  golf:       { key: "golf",       icon: CircleDot,       color: "#22C55E", labelTh: "กอล์ฟ",         labelEn: "Golf" },
  bills:      { key: "bills",      icon: Zap,             color: "#FACC15", labelTh: "ค่าน้ำค่าไฟ",    labelEn: "Bills" },
  cafe:       { key: "cafe",       icon: Coffee,          color: "#A16207", labelTh: "คาเฟ่",         labelEn: "Cafe" },
  wellness:   { key: "wellness",   icon: Flower2,         color: "#14B8A6", labelTh: "สุขภาพ/สปา",    labelEn: "Wellness" },
  grocery:    { key: "grocery",    icon: Store,           color: "#06B6D4", labelTh: "ซูเปอร์มาร์เก็ต", labelEn: "Grocery" },
  investment: { key: "investment", icon: TrendingUp,      color: "#8B5CF6", labelTh: "ลงทุน",         labelEn: "Investment" },
  transfer:   { key: "transfer",   icon: ArrowLeftRight,  color: "#6366F1", labelTh: "โอนเงิน",       labelEn: "Transfer" },
  travel:     { key: "travel",     icon: Plane,           color: "#0EA5E9", labelTh: "ท่องเที่ยว",     labelEn: "Travel" },
  other:      { key: "other",      icon: MoreHorizontal,  color: "#6B7280", labelTh: "อื่นๆ",         labelEn: "Other" },
};

export function getCategoryLabel(cat: Category, lang: "th" | "en"): string {
  return lang === "th" ? CATEGORY_MAP[cat]?.labelTh : CATEGORY_MAP[cat]?.labelEn ?? cat;
}

export function getCategoryColor(cat: string): string {
  return CATEGORY_MAP[cat as Category]?.color ?? CATEGORY_MAP.other.color;
}

export function getCategoryIcon(cat: string): LucideIcon {
  return CATEGORY_MAP[cat as Category]?.icon ?? CATEGORY_MAP.other.icon;
}
