import type { Lang } from "./i18n";
import { getCategoryLabel, type Category } from "./categories";

interface Expense {
  id: string;
  amount: number;
  date: string;
  time?: string | null;
  recipient: string;
  category: string;
  payment_method: string;
  expense_type?: string;
  ref_no?: string | null;
}

export function exportToCSV(expenses: Expense[], lang: Lang) {
  const headers = [
    lang === "th" ? "วันที่" : "Date",
    lang === "th" ? "เวลา" : "Time",
    lang === "th" ? "ผู้รับเงิน" : "Recipient",
    lang === "th" ? "จำนวน (บาท)" : "Amount (THB)",
    lang === "th" ? "หมวดหมู่" : "Category",
    lang === "th" ? "วิธีชำระ" : "Payment",
    lang === "th" ? "ประเภท" : "Type",
    "Ref No.",
  ];

  const rows = expenses.map((e) => [
    e.date,
    e.time || "",
    `"${e.recipient}"`,
    e.amount,
    getCategoryLabel(e.category as Category, lang),
    e.payment_method,
    e.expense_type || "personal",
    e.ref_no || "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
