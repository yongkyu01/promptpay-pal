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

/**
 * mock_ai_processor
 * Simulates Gemini Vision API extracting data from PromptPay slip images.
 * In production, replace this with actual Gemini API call via edge function.
 */
export async function mockAiProcessor(file: File, index: number): Promise<SlipData> {
  // Simulate processing delay (1-2s per image, like real OCR)
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

  // In a real implementation, this would:
  // 1. Upload image to Supabase Storage
  // 2. Call edge function → Gemini Vision API
  // 3. Parse structured response { amount, date, recipient, category }

  const mockResults: Array<{ recipient: string; amount: number; date: string; time: string; category: Category }> = [
    { recipient: "ร้านอาหารซีฟู้ด สมชาย", amount: 1500.00, date: "2025-03-27", time: "18:45", category: "food" },
    { recipient: "7-Eleven สาขาสยาม", amount: 85.00, date: "2025-03-26", time: "09:12", category: "food" },
    { recipient: "Grab Thailand", amount: 247.00, date: "2025-03-26", time: "14:30", category: "transport" },
    { recipient: "Shopee Payment", amount: 1299.00, date: "2025-03-25", time: "20:05", category: "shopping" },
    { recipient: "การไฟฟ้านครหลวง", amount: 890.00, date: "2025-03-24", time: "10:00", category: "utilities" },
    { recipient: "Netflix Thailand", amount: 349.00, date: "2025-03-23", time: "00:01", category: "entertainment" },
    { recipient: "BTS Skytrain", amount: 44.00, date: "2025-03-22", time: "08:15", category: "transport" },
    { recipient: "Lazada Payment", amount: 650.00, date: "2025-03-21", time: "16:40", category: "shopping" },
  ];

  // First uploaded image always returns the featured PromptPay slip
  const result = mockResults[index % mockResults.length];

  return {
    id: `slip-${Date.now()}-${index}`,
    amount: result.amount,
    date: result.date,
    time: result.time,
    recipient: result.recipient,
    category: result.category,
    imageUrl: URL.createObjectURL(file),
    analyzed: true,
  };
}

// Fixed initial data so total = 10,238 (adding 1,500 from new slip → 11,738)
export const INITIAL_SLIPS: SlipData[] = [
  { id: "init-1", amount: 2350, date: "2025-03-25", time: "19:30", recipient: "Central Department Store", category: "shopping", imageUrl: "/placeholder.svg", analyzed: true },
  { id: "init-2", amount: 1890, date: "2025-03-24", time: "12:15", recipient: "Grab Thailand", category: "transport", imageUrl: "/placeholder.svg", analyzed: true },
  { id: "init-3", amount: 450, date: "2025-03-23", time: "13:00", recipient: "ร้านก๋วยเตี๋ยว ลุงชัย", category: "food", imageUrl: "/placeholder.svg", analyzed: true },
  { id: "init-4", amount: 1200, date: "2025-03-22", time: "10:30", recipient: "การไฟฟ้านครหลวง", category: "utilities", imageUrl: "/placeholder.svg", analyzed: true },
  { id: "init-5", amount: 349, date: "2025-03-21", time: "00:01", recipient: "Spotify Premium", category: "entertainment", imageUrl: "/placeholder.svg", analyzed: true },
  { id: "init-6", amount: 1599, date: "2025-03-20", time: "15:45", recipient: "Shopee Payment", category: "shopping", imageUrl: "/placeholder.svg", analyzed: true },
  { id: "init-7", amount: 89, date: "2025-03-19", time: "08:20", recipient: "7-Eleven สาขาสยาม", category: "food", imageUrl: "/placeholder.svg", analyzed: true },
  { id: "init-8", amount: 2311, date: "2025-03-18", time: "20:10", recipient: "McDonald's Thailand", category: "food", imageUrl: "/placeholder.svg", analyzed: true },
];
