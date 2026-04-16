import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { startOfDay, format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { TrendingUp, Receipt, Clock, Crown, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PromptPayQR from "@/components/merchant/PromptPayQR";

export default function MerchantDashboardPage() {
  const { lang } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: sales = [] } = useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const today = startOfDay(new Date());
  const todaySales = useMemo(
    () => sales.filter((s) => new Date(s.created_at) >= today),
    [sales, today]
  );

  const todayTotal = todaySales.reduce((s, e) => s + Number(e.amount), 0);

  // Hourly breakdown
  const hourlyData = useMemo(() => {
    const hours: Record<number, number> = {};
    todaySales.forEach((s) => {
      const h = new Date(s.created_at).getHours();
      hours[h] = (hours[h] || 0) + Number(s.amount);
    });
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      total: hours[i] || 0,
    })).filter((h) => h.total > 0 || (h.hour >= "8:00" && h.hour <= "22:00"));
  }, [todaySales]);

  // Peak hour
  const peakHour = useMemo(() => {
    if (hourlyData.length === 0) return "-";
    const peak = hourlyData.reduce((a, b) => (b.total > a.total ? b : a));
    return peak.total > 0 ? peak.hour : "-";
  }, [hourlyData]);

  // Customer frequency (all-time by sender_name)
  const customerData = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => {
      const name = (s.sender_name || "").trim();
      if (name) map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [sales]);

  const recentSales = todaySales.slice(0, 8);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24 animate-slide-up">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 p-4 shadow-gold col-span-1">
          <TrendingUp className="h-4 w-4 text-amber-100 mb-1" />
          <p className="text-[10px] font-medium text-amber-100/80">{t("todaySales", lang)}</p>
          <p className="text-xl font-bold text-white">฿{todayTotal.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-amber-200/30 bg-card p-4">
          <Receipt className="h-4 w-4 text-amber-500 mb-1" />
          <p className="text-[10px] font-medium text-muted-foreground">{t("salesCount", lang)}</p>
          <p className="text-xl font-bold text-foreground">{todaySales.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-200/30 bg-card p-4">
          <Clock className="h-4 w-4 text-amber-500 mb-1" />
          <p className="text-[10px] font-medium text-muted-foreground">{t("peakHour", lang)}</p>
          <p className="text-xl font-bold text-foreground">{peakHour}</p>
        </div>
      </div>

      {/* QR Code Generator */}
      <PromptPayQR />

      {/* Hourly Chart */}
      {hourlyData.length > 0 && (
        <div className="rounded-2xl border border-amber-200/30 bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t("salesByHour", lang)}</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
                <Tooltip
                  formatter={(value: number) => [`฿${value.toLocaleString()}`, t("sales", lang)]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Sales */}
      <div className="rounded-2xl border border-amber-200/30 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("recentSales", lang)}</h2>
        <div className="space-y-2">
          {recentSales.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">{t("noSalesYet", lang)}</p>
          )}
          {recentSales.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{s.sender_name || "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(s.created_at), "HH:mm")}
                  {s.ref_no && ` · Ref: ${s.ref_no}`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-amber-600">+฿{Number(s.amount).toLocaleString()}</span>
                {s.is_verified && (
                  <p className="text-[10px] text-green-600 font-medium">✓ {t("verified", lang)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer History */}
      {customerData.length > 0 && (
        <div className="rounded-2xl border border-amber-200/30 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">{t("customerHistory", lang)}</h2>
          </div>
          <div className="space-y-2">
            {customerData.slice(0, 10).map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-2">
                  {c.count >= 3 && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                  <span className="text-sm text-foreground">{c.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-foreground">{c.count}</span>
                  <span className="text-[10px] text-muted-foreground">{t("visits", lang)}</span>
                  {c.count >= 3 && (
                    <span className="ml-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                      {t("regularCustomer", lang)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
