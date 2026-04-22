import { useEffect, useMemo, useState } from "react";
import { Dices, Play, Trophy, RotateCcw, CheckCircle2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t, type Lang } from "@/lib/i18n";

interface LadderMember {
  id: string;
  name: string;
}

interface Slot {
  amount: number;
  label: string;
}

interface SettlementLadderGameProps {
  lang: Lang;
  members: LadderMember[];
  total?: number;
  onApply?: (assignments: { memberId: string; amount: number; label: string }[]) => void;
}

type LadderRun = {
  paths: number[][];
  /** index in members[] -> index in slots[] */
  destinations: number[];
};

export default function SettlementLadderGame({ lang, members, total = 0, onApply }: SettlementLadderGameProps) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [run, setRun] = useState<LadderRun | null>(null);
  const [animating, setAnimating] = useState(false);

  const columnCount = members.length;
  const rowCount = Math.max(6, members.length + 3);

  // Auto-fill slots when member count changes
  useEffect(() => {
    if (members.length === 0) {
      setSlots([]);
      return;
    }
    setSlots((prev) => {
      if (prev.length === members.length) return prev;
      return buildPresetSlots(members.length, total, lang);
    });
    setRun(null);
  }, [members.length]);

  const slotsTotal = useMemo(
    () => slots.reduce((s, x) => s + (Number.isFinite(x.amount) ? x.amount : 0), 0),
    [slots]
  );
  const totalMatches = total > 0 ? Math.abs(slotsTotal - total) < 0.01 : true;

  const updateSlot = (i: number, patch: Partial<Slot>) => {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    setRun(null);
  };

  const presetFill = () => {
    setSlots(buildPresetSlots(members.length, total, lang));
    setRun(null);
  };

  const startGame = () => {
    if (members.length < 2 || slots.length !== members.length) return;
    const rungs = buildRungs(rowCount, columnCount);
    const paths = members.map((_, startIndex) => walk(rungs, startIndex, columnCount));
    const destinations = paths.map((p) => p[p.length - 1]);
    setAnimating(true);
    setRun({ paths, destinations });
    // animation duration matches CSS below
    window.setTimeout(() => setAnimating(false), 1400);
  };

  const reset = () => {
    setRun(null);
    setSlots(buildPresetSlots(members.length, total, lang));
  };

  const apply = () => {
    if (!run || !onApply) return;
    const assignments = members.map((m, i) => {
      const slot = slots[run.destinations[i]];
      return { memberId: m.id, amount: Number((slot?.amount || 0).toFixed(2)), label: slot?.label || "" };
    });
    onApply(assignments);
  };

  const rows = useMemo(() => Array.from({ length: rowCount }), [rowCount]);

  if (members.length < 2) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Dices className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{t("ladderGame", lang)}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("ladderGameDesc", lang)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={presetFill} className="rounded-xl" title={t("ladderPreset", lang)}>
            <Wand2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="secondary" size="sm" onClick={startGame} className="rounded-xl" disabled={animating}>
            <Play className="h-3.5 w-3.5" />
            {t("startLadder", lang)}
          </Button>
        </div>
      </div>

      {/* Ladder visual */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-secondary/40 p-4">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
          {/* Top: members */}
          {members.map((member, index) => {
            const isLucky = run && slots[run.destinations[index]]?.amount === Math.min(...slots.map((s) => s.amount));
            return (
              <div key={`top-${member.id}`} className="text-center">
                <div className={`rounded-xl px-2 py-2 text-xs font-semibold transition-all ${run && isLucky ? "bg-primary text-primary-foreground shadow-primary" : "bg-background text-foreground"}`}>
                  {member.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ladder paths */}
        <div className="relative mt-3" style={{ height: `${rowCount * 24}px` }}>
          {/* Vertical rails */}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
            {Array.from({ length: columnCount }).map((_, i) => (
              <div key={`rail-${i}`} className="relative">
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
              </div>
            ))}
          </div>

          {/* Highlighted path lines per member */}
          {run && members.map((member, mIdx) => {
            const path = run.paths[mIdx];
            return (
              <svg
                key={`path-${member.id}`}
                className="absolute inset-0 h-full w-full pointer-events-none"
                preserveAspectRatio="none"
                viewBox={`0 0 ${columnCount * 100} ${rowCount * 24}`}
              >
                <polyline
                  points={path.map((col, rIdx) => `${col * 100 + 50},${rIdx * 24}`).join(" ")}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.55}
                  style={{
                    strokeDasharray: animating ? 800 : "none",
                    strokeDashoffset: animating ? 800 : 0,
                    transition: "stroke-dashoffset 1.2s ease-out",
                  }}
                />
              </svg>
            );
          })}

          {/* Static rungs visualization */}
          {run && rows.map((_, rowIndex) => null)}
        </div>

        {/* Bottom: editable slots */}
        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
          {slots.map((slot, i) => (
            <div key={`slot-${i}`} className="rounded-xl border border-border bg-background p-2">
              <Input
                type="number"
                inputMode="decimal"
                value={Number.isFinite(slot.amount) ? slot.amount : 0}
                onChange={(e) => updateSlot(i, { amount: parseFloat(e.target.value) || 0 })}
                className="h-7 px-2 text-center text-sm font-bold"
                placeholder="0"
              />
              <Input
                type="text"
                value={slot.label}
                onChange={(e) => updateSlot(i, { label: e.target.value })}
                className="mt-1 h-6 px-2 text-center text-[10px]"
                placeholder={t("ladderSlotLabel", lang)}
              />
            </div>
          ))}
        </div>

        {/* Sum check */}
        {total > 0 && (
          <div className={`mt-2 text-center text-[11px] ${totalMatches ? "text-muted-foreground" : "text-destructive"}`}>
            ฿{slotsTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} / ฿{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            {!totalMatches && ` — ${t("ladderTotalMismatch", lang)}`}
          </div>
        )}
      </div>

      {/* Result list */}
      {run && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            {t("ladderResultTitle", lang)}
          </div>
          {members.map((m, i) => {
            const slot = slots[run.destinations[i]];
            const minAmt = Math.min(...slots.map((s) => s.amount));
            const isLucky = slot?.amount === minAmt;
            return (
              <div
                key={`res-${m.id}`}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${isLucky ? "bg-primary/10" : "bg-secondary/50"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{m.name}</span>
                  {slot?.label && (
                    <span className="text-[10px] text-muted-foreground">· {slot.label}</span>
                  )}
                </div>
                <span className={`text-sm font-bold ${isLucky ? "text-primary" : "text-foreground"}`}>
                  ฿{(slot?.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}

          {onApply && (
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={reset} className="flex-1 rounded-xl">
                <RotateCcw className="h-3.5 w-3.5" />
                {t("ladderReset", lang)}
              </Button>
              <Button size="sm" onClick={apply} className="flex-1 rounded-xl" disabled={!totalMatches}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("ladderApply", lang)}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function buildPresetSlots(memberCount: number, total: number, lang: Lang): Slot[] {
  if (memberCount === 0) return [];
  // One "jackpot" (free) slot + others split the total evenly
  if (total <= 0) {
    return Array.from({ length: memberCount }, (_, i) => ({
      amount: 0,
      label: i === 0 ? t("ladderJackpotLabel", lang) : t("ladderNormalLabel", lang),
    }));
  }
  if (memberCount === 1) {
    return [{ amount: Number(total.toFixed(2)), label: t("ladderNormalLabel", lang) }];
  }
  const others = memberCount - 1;
  const each = Number((total / others).toFixed(2));
  // adjust last slot for rounding
  const slots: Slot[] = [{ amount: 0, label: t("ladderJackpotLabel", lang) }];
  for (let i = 0; i < others; i++) {
    slots.push({ amount: each, label: t("ladderNormalLabel", lang) });
  }
  const sum = slots.reduce((s, x) => s + x.amount, 0);
  const diff = Number((total - sum).toFixed(2));
  if (Math.abs(diff) > 0.001) {
    slots[slots.length - 1].amount = Number((slots[slots.length - 1].amount + diff).toFixed(2));
  }
  return slots;
}

function buildRungs(rowCount: number, columnCount: number): boolean[][] {
  // For each row, place rungs without two adjacent on same row
  return Array.from({ length: rowCount }, () => {
    const row = Array.from({ length: Math.max(0, columnCount - 1) }, () => false);
    for (let i = 0; i < row.length; i++) {
      if (i > 0 && row[i - 1]) continue;
      row[i] = Math.random() < 0.45;
    }
    return row;
  });
}

function walk(rungs: boolean[][], startCol: number, columnCount: number): number[] {
  let col = startCol;
  const steps: number[] = [col];
  for (const row of rungs) {
    if (col > 0 && row[col - 1]) col -= 1;
    else if (col < columnCount - 1 && row[col]) col += 1;
    steps.push(col);
  }
  return steps;
}
