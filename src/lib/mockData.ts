import type { Category } from "./i18n";

export interface SlipData {
  id: string;
  amount: number;
  date: string;
  time: string;
  recipient: string;
  category: Category;
  imageUrl: string;
  analyzed: boolean;
}

// Simulate AI extraction from slip images
export function simulateExtraction(fileCount: number): SlipData[] {
  const recipients = [
    { name: "7-Eleven สาขาสยาม", category: "food" as Category },
    { name: "Grab Thailand", category: "transport" as Category },
    { name: "Shopee Payment", category: "shopping" as Category },
    { name: "การไฟฟ้านครหลวง", category: "utilities" as Category },
    { name: "Netflix Thailand", category: "entertainment" as Category },
    { name: "ร้านก๋วยเตี๋ยว ลุงชัย", category: "food" as Category },
    { name: "BTS Skytrain", category: "transport" as Category },
    { name: "Lazada Payment", category: "shopping" as Category },
    { name: "Central Department Store", category: "shopping" as Category },
    { name: "McDonald's Thailand", category: "food" as Category },
    { name: "AIS Payment", category: "utilities" as Category },
    { name: "Spotify Premium", category: "entertainment" as Category },
  ];

  return Array.from({ length: fileCount }, (_, i) => {
    const r = recipients[Math.floor(Math.random() * recipients.length)];
    const day = Math.floor(Math.random() * 28) + 1;
    const hour = Math.floor(Math.random() * 14) + 8;
    const min = Math.floor(Math.random() * 60);
    return {
      id: `slip-${Date.now()}-${i}`,
      amount: Math.round((Math.random() * 2000 + 20) * 100) / 100,
      date: `2025-03-${String(day).padStart(2, "0")}`,
      time: `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
      recipient: r.name,
      category: r.category,
      imageUrl: `/placeholder.svg`,
      analyzed: true,
    };
  });
}

export const INITIAL_SLIPS: SlipData[] = simulateExtraction(8);
