import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Trash2, Users as UsersIcon, Sparkles, QrCode, PartyPopper, Check, X } from "lucide-react";
import { toast } from "sonner";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";
import { fireConfetti } from "@/lib/confetti";
import SplitSummaryShareCard from "@/components/dutch/SplitSummaryShareCard";
import SettlementLadderGame from "@/components/dutch/SettlementLadderGame";

const COLORS = ["purple", "pink", "blue", "green", "orange", "cyan", "rose", "amber"];
const colorBg: Record<string, string> = {
  purple: "bg-purple-500", pink: "bg-pink-500", blue: "bg-blue-500", green: "bg-green-500",
  orange: "bg-orange-500", cyan: "bg-cyan-500", rose: "bg-rose-500", amber: "bg-amber-500",
};

export default function DutchSplitPage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [hostPromptpay, setHostPromptpay] = useState<string | null>(null);
  const [splitMethod, setSplitMethod] = useState<"equal" | "ladder">("equal");
  const [ladderAssignments, setLadderAssignments] = useState<Record<string, number>>({});

  const { data: split } = useQuery({
    queryKey: ["split", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("splits").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["split_members", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("split_members").select("*").eq("split_id", id!).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["split_items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("split_items").select("*").eq("split_id", id!).order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("promptpay_id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setHostPromptpay((data as any)?.promptpay_id ?? null));
  }, [user]);

  // Restore split method from server (so settled view shows ladder results)
  useEffect(() => {
    const m = (split as any)?.split_method;
    if (m === "ladder" || m === "equal") setSplitMethod(m);
  }, [split]);

  // Calculations
  const subtotal = useMemo(() => items.reduce((s, i) => s + Number(i.total), 0), [items]);
  const vatAmount = Number(split?.vat ?? 0);
  const serviceAmount = Number(split?.service_charge ?? 0);
  // If no detected vat/service from receipt, allow auto = 0; total falls back to subtotal + extras
  const total = subtotal + vatAmount + serviceAmount;

  // Per-member share
  const memberTotals = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((m) => map.set(m.id, 0));
    items.forEach((it) => {
      const assigned: string[] = Array.isArray(it.assigned_member_ids)
        ? (it.assigned_member_ids as any[]).map(String)
        : [];
      const targets = assigned.length > 0 ? assigned : members.map((m) => m.id);
      if (targets.length === 0) return;
      const share = Number(it.total) / targets.length;
      targets.forEach((mid) => map.set(mid, (map.get(mid) || 0) + share));
    });
    // Add proportional VAT + service
    const extras = vatAmount + serviceAmount;
    if (extras > 0 && subtotal > 0) {
      map.forEach((v, k) => map.set(k, v + (v / subtotal) * extras));
    } else if (extras > 0 && members.length > 0) {
      map.forEach((v, k) => map.set(k, v + extras / members.length));
    }
    return map;
  }, [items, members, vatAmount, serviceAmount, subtotal]);

  // ----- Mutations -----
  const addMember = async () => {
    if (!user || !id || !newName.trim()) return;
    const color = COLORS[members.length % COLORS.length];
    const { error } = await supabase.from("split_members").insert({
      user_id: user.id, split_id: id, name: newName.trim(), avatar_color: color,
    });
    if (error) return toast.error(error.message);
    setNewName("");
    queryClient.invalidateQueries({ queryKey: ["split_members", id] });
  };

  const removeMember = async (mid: string) => {
    await supabase.from("split_members").delete().eq("id", mid);
    // Clean assignments referencing this member
    const updates = items
      .filter((it) => Array.isArray(it.assigned_member_ids) && (it.assigned_member_ids as any[]).includes(mid))
      .map((it) =>
        supabase.from("split_items").update({
          assigned_member_ids: ((it.assigned_member_ids as any[]) || []).filter((x) => x !== mid),
        }).eq("id", it.id)
      );
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ["split_members", id] });
    queryClient.invalidateQueries({ queryKey: ["split_items", id] });
  };

  const toggleAssign = async (itemId: string, memberId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const current: string[] = Array.isArray(item.assigned_member_ids)
      ? (item.assigned_member_ids as any[]).map(String) : [];
    const next = current.includes(memberId)
      ? current.filter((x) => x !== memberId)
      : [...current, memberId];
    await supabase.from("split_items").update({ assigned_member_ids: next as any }).eq("id", itemId);
    queryClient.invalidateQueries({ queryKey: ["split_items", id] });
  };

  const addItem = async () => {
    if (!user || !id) return;
    const { error } = await supabase.from("split_items").insert({
      user_id: user.id, split_id: id, name: "Item", unit_price: 0, quantity: 1, total: 0,
      assigned_member_ids: [], position: items.length,
    });
    if (error) toast.error(error.message);
    queryClient.invalidateQueries({ queryKey: ["split_items", id] });
  };

  const updateItem = async (itemId: string, patch: any) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const merged = { ...item, ...patch };
    merged.total = Number(merged.unit_price || 0) * Number(merged.quantity || 1);
    await supabase.from("split_items").update({
      name: merged.name, unit_price: merged.total / Math.max(1, merged.quantity),
      quantity: merged.quantity, total: merged.total,
    }).eq("id", itemId);
    queryClient.invalidateQueries({ queryKey: ["split_items", id] });
  };

  // Local in-flight edits so totals update instantly while user types,
  // and DB writes are debounced.
  const [edits, setEdits] = useState<Record<string, { quantity?: number; unit_price?: number; name?: string }>>({});
  const editTimers = useRef<Record<string, number>>({});
  const queueItemUpdate = (itemId: string, patch: { quantity?: number; unit_price?: number; name?: string }) => {
    setEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
    if (editTimers.current[itemId]) window.clearTimeout(editTimers.current[itemId]);
    editTimers.current[itemId] = window.setTimeout(() => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      const merged = { ...item, ...edits[itemId], ...patch };
      void updateItem(itemId, {
        name: merged.name,
        quantity: Math.max(1, Number(merged.quantity) || 1),
        unit_price: Number(merged.unit_price) || 0,
      });
    }, 350);
  };
  // Clear local edits when fresh server data arrives matching the queued values
  useEffect(() => {
    setEdits((prev) => {
      const next: typeof prev = {};
      for (const [id, e] of Object.entries(prev)) {
        const item = items.find((i) => i.id === id);
        if (!item) continue;
        const same =
          (e.quantity == null || Number(item.quantity) === Number(e.quantity)) &&
          (e.unit_price == null || Number(item.unit_price) === Number(e.unit_price)) &&
          (e.name == null || item.name === e.name);
        if (!same) next[id] = e;
      }
      return next;
    });
  }, [items]);

  const removeItem = async (itemId: string) => {
    await supabase.from("split_items").delete().eq("id", itemId);
    queryClient.invalidateQueries({ queryKey: ["split_items", id] });
  };

  const showHostQR = async () => {
    if (!hostPromptpay) {
      toast.error(t("setPromptpayFirst", lang));
      return;
    }
    const me = members.find((m) => m.is_owner);
    const myShare = me ? memberTotals.get(me.id) || 0 : 0;
    // QR for full bill total — guests pay individual share to host
    const payload = generatePayload(hostPromptpay, { amount: Math.max(0.01, total - myShare) });
    const url = await QRCode.toDataURL(payload, { width: 320, margin: 1 });
    setQrUrl(url);
    setShowQR(true);
  };

  const finalize = async () => {
    if (!user || !id || !split) return;
    // If using ladder, keep the per-member amounts that were assigned by the
    // ladder result (already written to split_members.amount_due via onApply).
    // Only re-write member totals when using the equal/item-based split.
    if (splitMethod === "ladder") {
      const updates = members.map((m) =>
        supabase.from("split_members").update({
          amount_due: Number((ladderAssignments[m.id] || 0).toFixed(2)),
        }).eq("id", m.id)
      );
      await Promise.all(updates);
    } else {
      const updates = members.map((m) =>
        supabase.from("split_members").update({
          amount_due: Number((memberTotals.get(m.id) || 0).toFixed(2)),
        }).eq("id", m.id)
      );
      await Promise.all(updates);
    }
    // Update split totals + status + chosen method
    await supabase.from("splits").update({
      subtotal, total, status: "settled", split_method: splitMethod,
    } as any).eq("id", id);

    // Save my share to expenses (food) — pick from the source that matches the chosen method
    const me = members.find((m) => m.is_owner);
    const myShare = me
      ? splitMethod === "ladder"
        ? Number((ladderAssignments[me.id] ?? (me as any).amount_due ?? 0) || 0)
        : memberTotals.get(me.id) || 0
      : 0;
    if (myShare > 0) {
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from("expenses").insert({
        user_id: user.id,
        amount: Number(myShare.toFixed(2)),
        recipient: split.place || split.title,
        category: "food",
        date: today,
        payment_method: "promptpay",
        expense_type: "personal",
      });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    }
    fireConfetti();
    toast.success(t("expenseSaved", lang));
    queryClient.invalidateQueries({ queryKey: ["split", id] });
    queryClient.invalidateQueries({ queryKey: ["split_members", id] });
    queryClient.invalidateQueries({ queryKey: ["splits"] });
  };

  if (!split) {
    return <div className="mx-auto max-w-lg px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const isSettled = split.status === "settled";
  const summaryMembers = members.map((m) => ({
    id: m.id,
    name: m.name,
    amount:
      splitMethod === "ladder"
        ? Number((m as any).amount_due || 0)
        : memberTotals.get(m.id) || 0,
    isOwner: m.is_owner,
  }));

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-32 animate-slide-up">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/dutch")} className="rounded-full p-2 hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold text-foreground flex-1 truncate">{split.title}</h1>
        {isSettled && (
          <span className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary">✓ settled</span>
        )}
      </div>

      {/* Members */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <UsersIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t("members", lang)} · {members.length}</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {members.map((m) => (
            <div key={m.id} className="group flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${colorBg[m.avatar_color] || "bg-primary"} text-[10px] font-bold text-white`}>
                {m.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium">{m.name}{m.is_owner && " 👑"}</span>
              {!m.is_owner && !isSettled && (
                <button onClick={() => removeMember(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
        </div>
        {!isSettled && (
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMember()}
              placeholder={t("memberName", lang)}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={addMember} className="rounded-lg gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground active:scale-95">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("items", lang)} · {items.length}</h2>
          {!isSettled && (
            <button onClick={addItem} className="rounded-lg bg-secondary px-2 py-1 text-xs font-medium hover:bg-secondary/70">
              <Plus className="inline h-3 w-3 mr-0.5" /> Add
            </button>
          )}
        </div>
        <div className="space-y-3">
          {items.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">No items yet</p>
          )}
          {items.map((it) => {
            const assigned: string[] = Array.isArray(it.assigned_member_ids) ? (it.assigned_member_ids as any[]).map(String) : [];
            const e = edits[it.id] || {};
            const liveQty = e.quantity != null ? e.quantity : Number(it.quantity);
            const liveUnit = e.unit_price != null ? e.unit_price : Number(it.unit_price);
            const liveName = e.name != null ? e.name : it.name;
            const liveTotal = (Number(liveUnit) || 0) * (Number(liveQty) || 0);
            return (
              <div key={it.id} className="rounded-xl bg-secondary/40 p-3 space-y-2">
                {/* Row 1: name + delete */}
                <div className="flex items-center gap-2">
                  <input
                    value={liveName}
                    onChange={(ev) => queueItemUpdate(it.id, { name: ev.target.value })}
                    disabled={isSettled}
                    className="flex-1 min-w-0 rounded-md bg-background px-2 py-1 text-sm font-medium border border-input focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-70"
                  />
                  {!isSettled && (
                    <button onClick={() => removeItem(it.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {/* Row 2: qty × unit price = total */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={liveQty}
                    onChange={(ev) => {
                      const q = Math.max(1, Number(ev.target.value) || 1);
                      queueItemUpdate(it.id, { quantity: q });
                    }}
                    disabled={isSettled}
                    className="w-12 shrink-0 rounded-md bg-background px-1.5 py-1 text-sm text-center border border-input focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-70"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">×</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={liveUnit}
                    onChange={(ev) => {
                      const up = Number(ev.target.value) || 0;
                      queueItemUpdate(it.id, { unit_price: up });
                    }}
                    disabled={isSettled}
                    className="flex-1 min-w-0 rounded-md bg-background px-2 py-1 text-sm text-right border border-input focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-70"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">=</span>
                  <span className="w-24 shrink-0 rounded-md bg-background/60 px-2 py-1 text-sm text-right font-semibold border border-border">
                    ฿{liveTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
                {/* Assignment chips */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-muted-foreground self-center mr-1">{t("assignTo", lang)}</span>
                  {members.map((m) => {
                    const on = assigned.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        disabled={isSettled}
                        onClick={() => toggleAssign(it.id, m.id)}
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                          on
                            ? `${colorBg[m.avatar_color] || "bg-primary"} text-white scale-105 shadow-sm`
                            : "bg-background border border-border text-muted-foreground hover:border-primary/40"
                        } disabled:cursor-not-allowed`}
                      >
                        {on && <Check className="h-2.5 w-2.5" />}
                        {m.name}
                      </button>
                    );
                  })}
                  {assigned.length === 0 && (
                    <span className="text-[10px] italic text-muted-foreground self-center">→ {t("everyone", lang)} (n분의 1)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 text-sm">
        <Row label={t("subtotal", lang)} value={subtotal} />
        <Row label={t("vat", lang)} value={vatAmount} />
        <Row label={t("serviceCharge", lang)} value={serviceAmount} />
        <div className="my-1 border-t border-border" />
        <Row label={t("total", lang)} value={total} bold />
      </div>

      {/* Split method selector */}
      {!isSettled && members.length >= 2 && (
        <div className="rounded-2xl border border-border bg-card p-2">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setSplitMethod("equal")}
              className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                splitMethod === "equal"
                  ? "gradient-primary text-primary-foreground shadow-primary"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              🍽️ {t("splitMethodEqual", lang)}
            </button>
            <button
              onClick={() => setSplitMethod("ladder")}
              className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                splitMethod === "ladder"
                  ? "gradient-gold text-accent-foreground shadow-gold"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              🎲 {t("splitMethodLadder", lang)}
            </button>
          </div>
        </div>
      )}

      {/* Per-member summary card */}
      {splitMethod === "equal" && (
      <div className={`rounded-3xl p-5 text-white shadow-primary transition-all ${
        isSettled ? "gradient-gold" : "gradient-primary"
      }`}>
        <div className="flex items-center gap-2 mb-3">
          {isSettled ? <PartyPopper className="h-5 w-5" /> : <Sparkles className="h-5 w-5 animate-pulse" />}
          <h3 className="text-base font-bold">
            {isSettled ? t("finalizedTitle", lang) : t("summary", lang)}
          </h3>
        </div>
        <div className="space-y-2">
          {members.map((m) => {
            const v = memberTotals.get(m.id) || 0;
            return (
              <div key={m.id} className="flex items-center justify-between rounded-xl bg-white/10 backdrop-blur px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${colorBg[m.avatar_color] || "bg-white/30"} text-xs font-bold text-white border-2 border-white/40`}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{m.name}{m.is_owner && " 👑"}</span>
                </div>
                <span className="text-base font-bold">฿{v.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {splitMethod === "ladder" && !isSettled && (
        <SettlementLadderGame
          lang={lang}
          members={members.map((member) => ({ id: member.id, name: member.name }))}
          total={total}
          onAssignmentsChange={(assignments) => {
            if (!assignments) {
              setLadderAssignments({});
              return;
            }
            setLadderAssignments(
              assignments.reduce<Record<string, number>>((acc, current) => {
                acc[current.memberId] = current.amount;
                return acc;
              }, {})
            );
          }}
          onApply={async (assignments) => {
            setLadderAssignments(
              assignments.reduce<Record<string, number>>((acc, current) => {
                acc[current.memberId] = current.amount;
                return acc;
              }, {})
            );
            await Promise.all(
              assignments.map((a) =>
                supabase.from("split_members").update({ amount_due: a.amount }).eq("id", a.memberId)
              )
            );
            // Persist the chosen method so refresh / settled view uses ladder amounts
            await supabase.from("splits").update({ split_method: "ladder" } as any).eq("id", id!);
            queryClient.invalidateQueries({ queryKey: ["split", id] });
            queryClient.invalidateQueries({ queryKey: ["split_members", id] });
            toast.success(t("ladderApplied", lang));
          }}
        />
      )}

      {isSettled ? (
        <SplitSummaryShareCard
          lang={lang}
          title={split.title}
          place={split.place}
          subtotal={subtotal}
          vat={vatAmount}
          serviceCharge={serviceAmount}
          total={total}
          members={summaryMembers}
        />
      ) : null}

      {/* Actions */}
      {!isSettled ? (
        <button
          onClick={finalize}
          disabled={members.length === 0 || items.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-sm font-bold text-primary-foreground shadow-primary disabled:opacity-50 active:scale-95 transition-transform"
        >
          <PartyPopper className="h-4 w-4" />
          {t("finalize", lang)}
        </button>
      ) : (
        <button
          onClick={showHostQR}
          className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-gold py-4 text-sm font-bold text-accent-foreground shadow-gold active:scale-95 transition-transform"
        >
          <QrCode className="h-4 w-4" />
          {t("payViaQR", lang)}
        </button>
      )}

      {/* QR Modal */}
      {showQR && qrUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowQR(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl bg-card p-6 text-center shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-foreground">{t("hostQR", lang)}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("scanToPay", lang)}</p>
            <img src={qrUrl} alt="PromptPay QR" className="mx-auto mt-3 h-64 w-64 rounded-2xl border border-border" />
            <p className="mt-3 text-2xl font-bold text-primary">฿{(total - (memberTotals.get(members.find((x) => x.is_owner)?.id || "") || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            <p className="text-[11px] text-muted-foreground">PromptPay: {hostPromptpay}</p>
            <button onClick={() => setShowQR(false)} className="mt-4 w-full rounded-xl bg-secondary py-2 text-sm font-semibold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base font-bold text-foreground" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span>฿{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
    </div>
  );
}