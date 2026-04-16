import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Sparkles, Users, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Sale {
  id: string;
  amount: number;
  created_at: string;
  sender_name: string;
}

interface Props {
  todaySales: Sale[];
}

export default function DailyReport({ todaySales }: Props) {
  const { lang } = useApp();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const labels: Record<string, Record<string, string>> = {
    title: { th: "📊 รายงานการขายวันนี้", en: "📊 Today's Sales Report", ko: "📊 오늘의 장사 리포트", ja: "📊 本日の営業レポート" },
    customersByHour: { th: "จำนวนลูกค้าตามเวลา", en: "Customers by Hour", ko: "시간대별 손님 수", ja: "時間帯別来客数" },
    priceRanges: { th: "ช่วงราคาที่ขายดี", en: "Popular Price Ranges", ko: "인기 가격대", ja: "人気価格帯" },
    generateAI: { th: "✨ AI สรุปวันนี้", en: "✨ AI Summary", ko: "✨ AI 요약", ja: "✨ AI要約" },
    noData: { th: "ยังไม่มีข้อมูลวันนี้", en: "No data yet today", ko: "오늘 데이터가 없습니다", ja: "本日のデータはまだありません" },
    customers: { th: "คน", en: "customers", ko: "명", ja: "人" },
    orders: { th: "ออเดอร์", en: "orders", ko: "건", ja: "件" },
    avgSpend: { th: "เฉลี่ย", en: "Avg", ko: "평균", ja: "平均" },
  };

  const l = (key: string) => labels[key]?.[lang] || labels[key]?.["en"] || key;

  // Hourly customer count
  const hourlyCustomers = useMemo(() => {
    const hours: Record<number, number> = {};
    todaySales.forEach((s) => {
      const h = new Date(s.created_at).getHours();
      hours[h] = (hours[h] || 0) + 1;
    });
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      count: hours[i] || 0,
    })).filter((h) => h.count > 0 || (parseInt(h.hour) >= 8 && parseInt(h.hour) <= 22));
  }, [todaySales]);

  // Price range analysis
  const priceRanges = useMemo(() => {
    const ranges = [
      { label: "0-50฿", min: 0, max: 50, count: 0 },
      { label: "51-100฿", min: 51, max: 100, count: 0 },
      { label: "101-200฿", min: 101, max: 200, count: 0 },
      { label: "201-500฿", min: 201, max: 500, count: 0 },
      { label: "501-1000฿", min: 501, max: 1000, count: 0 },
      { label: "1000+฿", min: 1001, max: Infinity, count: 0 },
    ];
    todaySales.forEach((s) => {
      const amt = Number(s.amount);
      const r = ranges.find((r) => amt >= r.min && amt <= r.max);
      if (r) r.count++;
    });
    return ranges.filter((r) => r.count > 0);
  }, [todaySales]);

  const topPriceRange = useMemo(() => {
    if (priceRanges.length === 0) return "-";
    return priceRanges.reduce((a, b) => (b.count > a.count ? b : a)).label;
  }, [priceRanges]);

  const peakData = useMemo(() => {
    if (hourlyCustomers.length === 0) return { hour: "-", count: 0 };
    return hourlyCustomers.reduce((a, b) => (b.count > a.count ? b : a));
  }, [hourlyCustomers]);

  const avgAmount = useMemo(() => {
    if (todaySales.length === 0) return 0;
    return Math.round(todaySales.reduce((s, e) => s + Number(e.amount), 0) / todaySales.length);
  }, [todaySales]);

  const handleGenerateAI = async () => {
    if (todaySales.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-report", {
        body: {
          salesData: {
            totalAmount: todaySales.reduce((s, e) => s + Number(e.amount), 0).toLocaleString(),
            transactionCount: todaySales.length,
            peakHour: peakData.hour,
            peakCustomerCount: peakData.count,
            avgAmount: avgAmount.toLocaleString(),
            topPriceRange,
            hourlyCustomers: hourlyCustomers.filter((h) => h.count > 0),
          },
          lang,
        },
      });
      if (error) throw new Error(error.message);
      setAiSummary(data.summary);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  if (todaySales.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200/30 bg-card p-4 space-y-4">
      <h2 className="text-sm font-bold text-foreground">{l("title")}</h2>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-secondary/50 p-3 text-center">
          <Users className="h-4 w-4 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{todaySales.length}</p>
          <p className="text-[10px] text-muted-foreground">{l("customers")}</p>
        </div>
        <div className="rounded-xl bg-secondary/50 p-3 text-center">
          <DollarSign className="h-4 w-4 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">฿{avgAmount.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">{l("avgSpend")}</p>
        </div>
        <div className="rounded-xl bg-secondary/50 p-3 text-center">
          <Sparkles className="h-4 w-4 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{topPriceRange}</p>
          <p className="text-[10px] text-muted-foreground">Top</p>
        </div>
      </div>

      {/* Hourly customer chart */}
      {hourlyCustomers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">{l("customersByHour")}</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyCustomers} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [value, l("customers")]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Price range bars */}
      {priceRanges.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">{l("priceRanges")}</p>
          <div className="space-y-1.5">
            {priceRanges.map((r) => {
              const maxCount = Math.max(...priceRanges.map((p) => p.count));
              const pct = maxCount > 0 ? (r.count / maxCount) * 100 : 0;
              return (
                <div key={r.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-16 text-right">{r.label}</span>
                  <div className="flex-1 h-4 rounded bg-secondary/50 overflow-hidden">
                    <div
                      className="h-full rounded bg-gradient-to-r from-amber-500 to-yellow-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-foreground w-6">{r.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {aiSummary ? (
        <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-amber-500/10 border border-purple-300/20 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">{aiSummary}</p>
          </div>
        </div>
      ) : (
        <button
          onClick={handleGenerateAI}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-amber-500 py-2.5 text-sm font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {l("generateAI")}
        </button>
      )}
    </div>
  );
}
