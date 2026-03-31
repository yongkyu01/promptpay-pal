import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, CheckSquare, Square } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function CleanupPage() {
  const { lang } = useApp();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: processedSlips = [] } = useQuery({
    queryKey: ["slips", "processed", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("slips")
        .select("*, expenses(*)")
        .eq("is_processed", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === processedSlips.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(processedSlips.map((s) => s.id)));
    }
  };

  const handleDelete = async () => {
    const ids = Array.from(selected);
    const slipsToDelete = processedSlips.filter((s) => ids.includes(s.id));

    try {
      // Delete from Storage
      const storagePaths = slipsToDelete.map((s) => s.storage_path);
      if (storagePaths.length > 0) {
        await supabase.storage.from("slips").remove(storagePaths);
      }

      // Delete expenses linked to these slips
      const { error: expError } = await supabase
        .from("expenses")
        .delete()
        .in("slip_id", ids);
      if (expError) throw expError;

      // Delete slips from DB
      const { error: slipError } = await supabase
        .from("slips")
        .delete()
        .in("id", ids);
      if (slipError) throw slipError;

      queryClient.invalidateQueries({ queryKey: ["slips"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(lang === "th" ? `ลบ ${ids.length} สลิปแล้ว` : `Deleted ${ids.length} slips`);
      setSelected(new Set());
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24 animate-slide-up">
      <div>
        <h2 className="text-lg font-bold text-foreground">{t("readyToClean", lang)}</h2>
        <p className="text-sm text-muted-foreground">{t("cleanupDesc", lang)}</p>
      </div>

      {processedSlips.length > 0 && (
        <div className="flex items-center justify-between">
          <button onClick={toggleAll} className="flex items-center gap-2 text-sm font-medium text-primary">
            {selected.size === processedSlips.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {t("selectAll", lang)}
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground transition-transform active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("deleteSelected", lang)} ({selected.size})
            </button>
          )}
        </div>
      )}

      {processedSlips.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">{t("noSlips", lang)}</p>
      )}

      <div className="space-y-2">
        {processedSlips.map((slip) => {
          const expense = slip.expenses?.[0];
          return (
            <button
              key={slip.id}
              onClick={() => toggleOne(slip.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                selected.has(slip.id) ? "border-primary bg-purple-light" : "border-border bg-card"
              }`}
            >
              {selected.has(slip.id) ? (
                <CheckSquare className="h-5 w-5 flex-shrink-0 text-primary" />
              ) : (
                <Square className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              )}
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                <img src={slip.image_url} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {expense?.recipient || slip.storage_path.split("/").pop()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {expense ? `${expense.date} · -฿${Number(expense.amount).toLocaleString()}` : slip.created_at.split("T")[0]}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
