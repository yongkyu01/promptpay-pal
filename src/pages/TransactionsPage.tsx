import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import { getCategoryLabel, getCategoryColor, getCategoryIcon, type Category } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { X, Search, CalendarIcon, Briefcase } from "lucide-react";
import { useState, useMemo } from "react";
import { startOfWeek, startOfMonth, format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useExchangeRate } from "@/hooks/useExchangeRate";

type DatePreset = "all" | "week" | "month" | "custom";

const DATE_LABELS: Record<DatePreset, { th: string; en: string }> = {
  all: { th: "ทั้งหมด", en: "All" },
  week: { th: "สัปดาห์นี้", en: "This Week" },
  month: { th: "เดือนนี้", en: "This Month" },
  custom: { th: "เลือกเอง", en: "Custom" },
};

export default function TransactionsPage() {
  const { lang } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const { convert: toKRW } = useExchangeRate();

  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    let result = expenses;

    // Category filter
    if (categoryFilter) {
      result = result.filter((e) => e.category === categoryFilter);
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((e) => e.recipient.toLowerCase().includes(q));
    }

    // Date filter
    const now = new Date();
    if (datePreset === "week") {
      const ws = startOfWeek(now, { weekStartsOn: 1 });
      result = result.filter((e) => new Date(e.date) >= ws);
    } else if (datePreset === "month") {
      const ms = startOfMonth(now);
      result = result.filter((e) => new Date(e.date) >= ms);
    } else if (datePreset === "custom") {
      if (customFrom) result = result.filter((e) => new Date(e.date) >= customFrom);
      if (customTo) {
        const toEnd = new Date(customTo);
        toEnd.setHours(23, 59, 59, 999);
        result = result.filter((e) => new Date(e.date) <= toEnd);
      }
    }

    return result;
  }, [expenses, categoryFilter, search, datePreset, customFrom, customTo]);

  const totalFiltered = useMemo(
    () => filtered.reduce((s, e) => s + Number(e.amount), 0),
    [filtered]
  );

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, e) => {
    (acc[e.date] ??= []).push(e);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="mx-auto max-w-lg space-y-3 px-4 py-4 pb-24 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{t("transactions", lang)}</h2>
        {categoryFilter && (
          <button
            onClick={() => setSearchParams({})}
            className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-primary-foreground"
            style={{ background: getCategoryColor(categoryFilter) }}
          >
            {getCategoryLabel(categoryFilter as Category, lang)}
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === "th" ? "ค้นหาชื่อร้านค้า..." : "Search by store name..."}
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Date Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {(["all", "week", "month", "custom"] as DatePreset[]).map((p) => (
          <button
            key={p}
            onClick={() => setDatePreset(p)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              datePreset === p
                ? "gradient-primary text-primary-foreground shadow-primary"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {DATE_LABELS[p][lang]}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      {datePreset === "custom" && (
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex-1 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs",
                !customFrom && "text-muted-foreground"
              )}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {customFrom ? format(customFrom, "yyyy-MM-dd") : (lang === "th" ? "วันเริ่มต้น" : "From")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customFrom}
                onSelect={setCustomFrom}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex-1 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs",
                !customTo && "text-muted-foreground"
              )}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {customTo ? format(customTo, "yyyy-MM-dd") : (lang === "th" ? "วันสิ้นสุด" : "To")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={customTo}
                onSelect={setCustomTo}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-2">
        <span className="text-xs text-muted-foreground">
          {filtered.length} {lang === "th" ? "รายการ" : "items"}
        </span>
        <span className="text-sm font-bold text-foreground">
          ฿{totalFiltered.toLocaleString("th-TH", { minimumFractionDigits: 0 })}
        </span>
      </div>

      {/* Transactions List */}
      {sortedDates.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {search ? (lang === "th" ? "ไม่พบผลลัพธ์" : "No results found") : t("noSlips", lang)}
        </p>
      )}

      {sortedDates.map((date) => (
        <div key={date}>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">{date}</p>
          <div className="space-y-2">
            {grouped[date].map((exp) => {
              const Icon = getCategoryIcon(exp.category);
              const color = getCategoryColor(exp.category);
              return (
                <button key={exp.id} onClick={() => navigate(`/expense/${exp.id}`)} className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-secondary">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ background: color + "18" }}
                    >
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{exp.recipient}</p>
                      <p className="text-xs text-muted-foreground">
                        {exp.time} · {getCategoryLabel(exp.category as Category, lang)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">-฿{Number(exp.amount).toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
