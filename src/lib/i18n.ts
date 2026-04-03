export type Lang = "th" | "en";

const translations = {
  appName: { th: "Keb-Dee", en: "Keb-Dee" },
  dashboard: { th: "แดชบอร์ด", en: "Dashboard" },
  upload: { th: "อัปโหลด", en: "Upload" },
  transactions: { th: "รายการ", en: "Transactions" },
  cleanup: { th: "จัดการ", en: "Cleanup" },
  totalSpending: { th: "ยอดใช้จ่ายรวม", en: "Total Spending" },
  thisMonth: { th: "เดือนนี้", en: "This Month" },
  slipsProcessed: { th: "สลิปที่ประมวลผลแล้ว", en: "Slips Processed" },
  categoryBreakdown: { th: "สัดส่วนรายจ่าย", en: "Category Breakdown" },
  recentTransactions: { th: "รายการล่าสุด", en: "Recent Transactions" },
  uploadSlips: { th: "อัปโหลดสลิป", en: "Upload Slips" },
  uploadDesc: { th: "เลือกภาพสลิป PromptPay จากแกลเลอรี่", en: "Select PromptPay slip images from gallery" },
  selectImages: { th: "เลือกรูปภาพ", en: "Select Images" },
  analyzing: { th: "กำลังวิเคราะห์...", en: "Analyzing..." },
  analysisComplete: { th: "วิเคราะห์เสร็จแล้ว", en: "Analysis Complete" },
  readyToClean: { th: "พร้อมลบ", en: "Ready to Clean" },
  cleanupDesc: { th: "สลิปที่วิเคราะห์แล้ว สามารถลบออกได้", en: "Analyzed slips ready for deletion" },
  deleteSelected: { th: "ลบที่เลือก", en: "Delete Selected" },
  selectAll: { th: "เลือกทั้งหมด", en: "Select All" },
  noSlips: { th: "ยังไม่มีสลิป", en: "No slips yet" },
  thb: { th: "฿", en: "฿" },
  slips: { th: "สลิป", en: "slips" },
  language: { th: "EN", en: "TH" },
  logout: { th: "ออกจากระบบ", en: "Logout" },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang): string {
  return translations[key]?.[lang] ?? key;
}
