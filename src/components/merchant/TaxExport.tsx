import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FileSpreadsheet, Download, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, subMonths, format, startOfQuarter, endOfQuarter } from "date-fns";

const labels: Record<string, Record<string, string>> = {
  title: { th: "📋 ส่งออกรายงานภาษี", en: "📋 Tax Export Report", ko: "📋 세무 리포트 내보내기", ja: "📋 税務レポート出力" },
  desc: { th: "ส่งออกข้อมูลสำหรับยื่นภาษี ภ.พ.30", en: "Export data for Thai tax filing (PP.30)", ko: "태국 세무 신고용 데이터 내보내기", ja: "タイ税務申告用データ出力" },
  thisMonth: { th: "เดือนนี้", en: "This Month", ko: "이번 달", ja: "今月" },
  lastMonth: { th: "เดือนที่แล้ว", en: "Last Month", ko: "지난 달", ja: "先月" },
  thisQuarter: { th: "ไตรมาสนี้", en: "This Quarter", ko: "이번 분기", ja: "今四半期" },
  lastQuarter: { th: "ไตรมาสที่แล้ว", en: "Last Quarter", ko: "지난 분기", ja: "前四半期" },
  exportCSV: { th: "ส่งออก CSV", en: "Export CSV", ko: "CSV 내보내기", ja: "CSV出力" },
  generating: { th: "กำลังสร้าง...", en: "Generating...", ko: "생성 중...", ja: "生成中..." },
  salesSummary: { th: "สรุปยอดขาย", en: "Sales Summary", ko: "매출 요약", ja: "売上要約" },
  expenseSummary: { th: "สรุปค่าใช้จ่าย", en: "Expense Summary", ko: "지출 요약", ja: "支出要約" },
  noData: { th: "ไม่มีข้อมูลในช่วงนี้", en: "No data in this period", ko: "해당 기간 데이터 없음", ja: "該当期間のデータなし" },
  totalSales: { th: "ยอดขายรวม", en: "Total Sales", ko: "총 매출", ja: "売上合計" },
  totalExpenses: { th: "ค่าใช้จ่ายรวม", en: "Total Expenses", ko: "총 지출", ja: "経費合計" },
  netIncome: { th: "รายได้สุทธิ", en: "Net Income", ko: "순수익", ja: "純利益" },
};

type Period = "thisMonth" | "lastMonth" | "thisQuarter" | "lastQuarter";

export default function TaxExport() {
  const { lang } = useApp();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("thisMonth");
  const [loading, setLoading] = useState(false);

  const l = (key: string) => labels[key]?.[lang] || labels[key]?.["en"] || key;

  const getRange = (p: Period): [Date, Date] => {
    const now = new Date();
    switch (p) {
      case "thisMonth": return [startOfMonth(now), endOfMonth(now)];
      case "lastMonth": return [startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1))];
      case "thisQuarter": return [startOfQuarter(now), endOfQuarter(now)];
      case "lastQuarter": return [startOfQuarter(subMonths(now, 3)), endOfQuarter(subMonths(now, 3))];
    }
  };

  const handleExport = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [start, end] = getRange(period);
      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      // Fetch sales
      const { data: sales, error: salesErr } = await supabase
        .from("sales")
        .select("*")
        .gte("date", startStr)
        .lte("date", endStr)
        .order("date", { ascending: true });
      if (salesErr) throw salesErr;

      // Fetch merchant expenses
      const { data: expenses, error: expErr } = await supabase
        .from("merchant_expenses")
        .select("*")
        .gte("date", startStr)
        .lte("date", endStr)
        .order("date", { ascending: true });
      if (expErr) throw expErr;

      if ((!sales || sales.length === 0) && (!expenses || (expenses as any[]).length === 0)) {
        toast.info(l("noData"));
        setLoading(false);
        return;
      }

      // Build CSV - Thai tax format
      const BOM = "\uFEFF";
      let csv = BOM;

      // Header info
      csv += `รายงานภาษี / Tax Report\n`;
      csv += `ช่วงเวลา / Period: ${startStr} - ${endStr}\n`;
      csv += `สร้างเมื่อ / Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}\n\n`;

      // Sales section
      const totalSales = (sales || []).reduce((s, e) => s + Number(e.amount), 0);
      csv += `=== ${l("salesSummary")} ===\n`;
      csv += `วันที่,เลขอ้างอิง,ชื่อลูกค้า,จำนวนเงิน (฿),สถานะ\n`;
      csv += `Date,Reference,Customer,Amount (THB),Status\n`;
      (sales || []).forEach((s) => {
        csv += `${s.date},${s.ref_no || ""},${(s.sender_name || "").replace(/,/g, " ")},${s.amount},${s.is_verified ? "Verified" : "Pending"}\n`;
      });
      csv += `\n${l("totalSales")}: ฿${totalSales.toLocaleString()}\n\n`;

      // Expenses section
      const expensesArr = (expenses || []) as any[];
      const totalExp = expensesArr.reduce((s: number, e: any) => s + Number(e.amount), 0);
      csv += `=== ${l("expenseSummary")} ===\n`;
      csv += `วันที่,หมวดหมู่,รายละเอียด,จำนวนเงิน (฿)\n`;
      csv += `Date,Category,Description,Amount (THB)\n`;
      expensesArr.forEach((e: any) => {
        csv += `${e.date},${e.category},${(e.description || "").replace(/,/g, " ")},${e.amount}\n`;
      });
      csv += `\n${l("totalExpenses")}: ฿${totalExp.toLocaleString()}\n`;
      csv += `${l("netIncome")}: ฿${(totalSales - totalExp).toLocaleString()}\n`;

      // Download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tax-report_${startStr}_${endStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("✓ Downloaded");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200/30 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-bold text-foreground">{l("title")}</h2>
      </div>
      <p className="text-xs text-muted-foreground">{l("desc")}</p>

      {/* Period selector */}
      <div className="grid grid-cols-2 gap-2">
        {(["thisMonth", "lastMonth", "thisQuarter", "lastQuarter"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
              period === p
                ? "bg-amber-500/20 text-amber-700 border border-amber-300/50"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Calendar className="h-3 w-3" />
            {l(p)}
          </button>
        ))}
      </div>

      <button
        onClick={handleExport}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 py-3 text-sm font-bold text-white shadow-gold transition-transform active:scale-95 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {loading ? l("generating") : l("exportCSV")}
      </button>
    </div>
  );
}
