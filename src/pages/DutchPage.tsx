import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Camera, Users as UsersIcon, Receipt, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function DutchPage() {
  const { lang } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [creating, setCreating] = useState(false);

  const { data: splits = [] } = useQuery({
    queryKey: ["splits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("splits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    setCreating(true);
    try {
      const path = `${user.id}/receipt-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("slips").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("slips").getPublicUrl(path);

      const { data: ai, error: aiErr } = await supabase.functions.invoke("analyze-receipt", {
        body: { imageUrl: urlData.publicUrl },
      });
      if (aiErr) throw new Error(aiErr.message);
      if (ai?.error) throw new Error(ai.error);

      // Get host display name
      const { data: profile } = await supabase
        .from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      const hostName = profile?.display_name || (user.email?.split("@")[0]) || "Me";

      const { data: split, error: splitErr } = await supabase
        .from("splits")
        .insert({
          user_id: user.id,
          title: ai.place || "Dutch",
          place: ai.place || null,
          receipt_image_url: urlData.publicUrl,
          subtotal: ai.subtotal || 0,
          vat: ai.vat || 0,
          service_charge: ai.service_charge || 0,
          total: ai.total || 0,
        })
        .select()
        .single();
      if (splitErr) throw splitErr;

      // Owner member
      await supabase.from("split_members").insert({
        user_id: user.id,
        split_id: split.id,
        name: hostName,
        linked_user_id: user.id,
        is_owner: true,
        avatar_color: "purple",
      });

      // Items
      if (Array.isArray(ai.items) && ai.items.length > 0) {
        const rows = ai.items.map((it: any, idx: number) => ({
          user_id: user.id,
          split_id: split.id,
          name: it.name,
          unit_price: Number(it.unit_price) || 0,
          quantity: Number(it.quantity) || 1,
          total: Number(it.total) || 0,
          assigned_member_ids: [],
          position: idx,
        }));
        await supabase.from("split_items").insert(rows);
      }

      toast.success(t("splitCreated", lang));
      queryClient.invalidateQueries({ queryKey: ["splits"] });
      navigate(`/dutch/${split.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setCreating(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const startBlank = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const { data: profile } = await supabase
        .from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      const hostName = profile?.display_name || (user.email?.split("@")[0]) || "Me";

      const { data: split, error } = await supabase
        .from("splits").insert({ user_id: user.id, title: "Dutch" }).select().single();
      if (error) throw error;

      await supabase.from("split_members").insert({
        user_id: user.id, split_id: split.id, name: hostName,
        linked_user_id: user.id, is_owner: true, avatar_color: "purple",
      });
      queryClient.invalidateQueries({ queryKey: ["splits"] });
      navigate(`/dutch/${split.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24 animate-slide-up">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl gradient-primary p-6 shadow-primary">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-4 h-28 w-28 rounded-full bg-accent/30 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{t("dutchTitle", lang)}</p>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white">{t("dutchSubtitle", lang)}</h1>
        </div>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={creating}
          className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-all hover:scale-[1.02] hover:shadow-primary disabled:opacity-50"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-primary">
            {creating ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
          </div>
          <p className="text-sm font-semibold text-foreground">{t("scanReceipt", lang)}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{t("scanReceiptDesc", lang)}</p>
        </button>
        <button
          onClick={startBlank}
          disabled={creating}
          className="group rounded-2xl border border-border bg-card p-4 text-left transition-all hover:scale-[1.02] hover:shadow-gold disabled:opacity-50"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl gradient-gold shadow-gold">
            <UsersIcon className="h-5 w-5 text-accent-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">{t("newSplit", lang)}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{t("addMember", lang)}</p>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleScan}
      />

      {/* Recent splits */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("recentSplits", lang)}</h2>
        </div>
        {splits.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noSplitsYet", lang)}</p>
        ) : (
          <div className="space-y-2">
            {splits.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/dutch/${s.id}`)}
                className="flex w-full items-center justify-between rounded-xl bg-secondary/50 px-3 py-3 text-left transition-colors hover:bg-secondary"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(s.created_at), "MMM d, HH:mm")}
                    {" · "}
                    <span className={s.status === "settled" ? "text-primary" : "text-accent-foreground"}>
                      {s.status === "settled" ? "✓ settled" : "open"}
                    </span>
                  </p>
                </div>
                <span className="text-sm font-bold text-primary">฿{Number(s.total).toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}