import { useApp } from "@/context/AppContext";
import { exportToCSV } from "@/lib/exportUtils";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
  expenses: any[];
}

export default function ExportButton({ expenses }: ExportButtonProps) {
  const { lang } = useApp();

  const handleExport = () => {
    if (expenses.length === 0) {
      toast.error(lang === "th" ? "ไม่มีข้อมูลให้ส่งออก" : "No data to export");
      return;
    }
    exportToCSV(expenses, lang);
    toast.success(lang === "th" ? "ดาวน์โหลด CSV สำเร็จ!" : "CSV downloaded!");
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
    >
      <Download className="h-4 w-4 text-primary" />
      {lang === "th" ? "ส่งออก CSV" : "Export CSV"}
    </button>
  );
}
