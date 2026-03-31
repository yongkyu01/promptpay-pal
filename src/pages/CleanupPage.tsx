import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";
import { Trash2, CheckSquare, Square } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CleanupPage() {
  const { lang, slips, removeSlips } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const analyzedSlips = slips.filter((s) => s.analyzed);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === analyzedSlips.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(analyzedSlips.map((s) => s.id)));
    }
  };

  const handleDelete = () => {
    removeSlips(Array.from(selected));
    toast.success(lang === "th" ? `ลบ ${selected.size} สลิปแล้ว` : `Deleted ${selected.size} slips`);
    setSelected(new Set());
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24 animate-slide-up">
      <div>
        <h2 className="text-lg font-bold text-foreground">{t("readyToClean", lang)}</h2>
        <p className="text-sm text-muted-foreground">{t("cleanupDesc", lang)}</p>
      </div>

      {analyzedSlips.length > 0 && (
        <div className="flex items-center justify-between">
          <button onClick={toggleAll} className="flex items-center gap-2 text-sm font-medium text-primary">
            {selected.size === analyzedSlips.length ? (
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

      {analyzedSlips.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">{t("noSlips", lang)}</p>
      )}

      <div className="space-y-2">
        {analyzedSlips.map((slip) => (
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
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{slip.recipient}</p>
              <p className="text-xs text-muted-foreground">{slip.date} · -฿{slip.amount.toLocaleString()}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
