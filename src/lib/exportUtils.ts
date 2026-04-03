import type { Lang } from "./i18n";
import { getCategoryLabel, type Category } from "./categories";
import { t } from "./i18n";

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
    t("date", lang),
    t("time", lang),
    t("receiver", lang),
    t("amount", lang),
    t("category", lang),
    t("paymentMethod", lang),
    t("expense", lang),
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
