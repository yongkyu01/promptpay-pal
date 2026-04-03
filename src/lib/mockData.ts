import type { Category } from "./categories";

/**
 * mock_ai_processor
 * Simulates Gemini Vision API extracting data from PromptPay slip images.
 * Returns extracted data (amount, recipient, category, date, time).
 */
export async function mockAiProcessor(
  _file: File,
  index: number
): Promise<{ amount: number; recipient: string; category: Category; date: string; time: string }> {
  // Simulate processing delay
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

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

  return mockResults[index % mockResults.length];
}
