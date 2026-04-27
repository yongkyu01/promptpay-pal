import { useEffect, useMemo, useState } from "react";
import { Dices, Play, Trophy, RotateCcw, CheckCircle2, Wand2, Shuffle } from "lucide-react";

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

// Ladder geometry (in SVG user units)
const COL_W = 100;
const ROW_H = 36;
const TOP_PAD = 12;
const BOTTOM_PAD = 12;

// Path reveal animation duration (ms)
const PATH_REVEAL_MS = 5200;

// Color palette for player tracks (HSL via CSS vars when available, fallback to fixed hues)
const TRACK_COLORS = [
  "hsl(0 84% 60%)",
  "hsl(220 90% 56%)",
  "hsl(140 70% 45%)",
  "hsl(35 95% 55%)",
  "hsl(280 75% 60%)",
  "hsl(190 85% 50%)",
  "hsl(330 80% 60%)",
  "hsl(50 95% 55%)",
];

// Animal traveler emojis – one per member slot
const TRAVELERS = ["🐰", "🐶", "🐱", "🦊", "🐼", "🐵", "🐯", "🐻"];

export default function SettlementLadderGame({ lang, members, total = 0, onApply }: SettlementLadderGameProps) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [rungs, setRungs] = useState<boolean[][]>([]);
  const [run, setRun] = useState<LadderRun | null>(null);
  const [activeMember, setActiveMember] = useState<number | null>(null);
  // Members that have already arrived at their destination (show arrival pop)
  const [arrived, setArrived] = useState<boolean[]>([]);
  const [cloudsLifted, setCloudsLifted] = useState(false);

  const columnCount = members.length;
  const rowCount = Math.max(8, members.length * 2 + 4);

  // Build rungs whenever the grid size changes
  useEffect(() => {
    if (columnCount < 2) {
      setRungs([]);
      return;
    }
    setRungs(buildRungs(rowCount, columnCount));
    setRun(null);
    setActiveMember(null);
    setArrived([]);
    setCloudsLifted(false);
  }, [columnCount, rowCount]);

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

  const shuffleRungs = () => {
    setRungs(buildRungs(rowCount, columnCount));
    setRun(null);
    setActiveMember(null);
    setArrived([]);
    setCloudsLifted(false);
  };

  const ensureRun = (): LadderRun => {
    const r = rungs.length ? rungs : buildRungs(rowCount, columnCount);
    if (!rungs.length) setRungs(r);
    if (run) return run;
    const paths = members.map((_, startIndex) => walk(r, startIndex, columnCount));
    const destinations = paths.map((p) => p[p.length - 1]);
    const next = { paths, destinations };
    setRun(next);
    return next;
  };

  const playMember = (index: number) => {
    if (activeMember !== null) return;
    setCloudsLifted(true);
    ensureRun();
    setActiveMember(index);
    setArrived((prev) => {
      const base = prev.length === members.length ? [...prev] : members.map(() => false);
      base[index] = false;
      return base;
    });
    window.setTimeout(() => {
      setArrived((prev) => {
        const base = prev.length === members.length ? [...prev] : members.map(() => false);
        base[index] = true;
        return base;
      });
      setActiveMember(null);
    }, PATH_REVEAL_MS + 100);
  };

  const startGame = () => {
    if (members.length < 2 || slots.length !== members.length) return;
    setCloudsLifted(true);
    ensureRun();
    setArrived(members.map(() => false));
    // Play each member sequentially
    const perPath = PATH_REVEAL_MS + 300;
    members.forEach((_, i) => {
      window.setTimeout(() => {
        setActiveMember(i);
        window.setTimeout(() => {
          setArrived((prev) => {
            const base = prev.length === members.length ? [...prev] : members.map(() => false);
            base[i] = true;
            return base;
          });
        }, PATH_REVEAL_MS + 50);
      }, i * perPath);
    });
    window.setTimeout(() => setActiveMember(null), members.length * perPath + 200);
  };

  const reset = () => {
    setRun(null);
    setActiveMember(null);
    setArrived([]);
    setSlots(buildPresetSlots(members.length, total, lang));
    setRungs(buildRungs(rowCount, columnCount));
    setCloudsLifted(false);
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
          <Button variant="outline" size="sm" onClick={shuffleRungs} className="rounded-xl" title="Shuffle ladder">
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
          <Button variant="secondary" size="sm" onClick={startGame} className="rounded-xl" disabled={activeMember !== null}>
            <Play className="h-3.5 w-3.5" />
            {t("startLadder", lang)}
          </Button>
        </div>
      </div>

      {/* Ladder visual */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-secondary/40 p-3">
        {/* Top: clickable member chips */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
          {members.map((member, index) => {
            const color = TRACK_COLORS[index % TRACK_COLORS.length];
            const isActive = activeMember === index;
            return (
              <button
                key={`top-${member.id}`}
                type="button"
                onClick={() => playMember(index)}
                className={`rounded-xl px-2 py-2 text-xs font-semibold transition-all ${isActive ? "scale-105 shadow-primary" : ""}`}
                style={{ background: color, color: "white" }}
              >
                <span className="mr-1">{TRAVELERS[index % TRAVELERS.length]}</span>
                {member.name}
              </button>
            );
          })}
        </div>

        {/* Ladder SVG */}
        <div className="relative mt-2">
        <svg
          className="mt-2 w-full"
          viewBox={`0 0 ${columnCount * COL_W} ${rowCount * ROW_H + TOP_PAD + BOTTOM_PAD}`}
          preserveAspectRatio="none"
          style={{ height: `${rowCount * ROW_H + TOP_PAD + BOTTOM_PAD}px`, maxHeight: 420 }}
        >
          {/* Vertical rails */}
          {Array.from({ length: columnCount }).map((_, i) => (
            <line
              key={`rail-${i}`}
              x1={i * COL_W + COL_W / 2}
              x2={i * COL_W + COL_W / 2}
              y1={TOP_PAD}
              y2={rowCount * ROW_H + TOP_PAD}
              stroke="hsl(var(--border))"
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}

          {/* Horizontal rungs */}
          {rungs.map((row, rIdx) =>
            row.map((on, cIdx) =>
              on ? (
                <line
                  key={`rung-${rIdx}-${cIdx}`}
                  x1={cIdx * COL_W + COL_W / 2}
                  x2={(cIdx + 1) * COL_W + COL_W / 2}
                  y1={TOP_PAD + rIdx * ROW_H + ROW_H / 2}
                  y2={TOP_PAD + rIdx * ROW_H + ROW_H / 2}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={0.55}
                />
              ) : null
            )
          )}

          {/* Animated player paths — only render the active member's trail + traveler */}
          {run && activeMember !== null && (() => {
            const mIdx = activeMember;
            const path = run.paths[mIdx];
            const d = buildSvgPath(path);
            const length = estimateLength(path);
            const color = TRACK_COLORS[mIdx % TRACK_COLORS.length];
            const traveler = TRAVELERS[mIdx % TRAVELERS.length];
            const endX = path[path.length - 1] * COL_W + COL_W / 2;
            const endY = TOP_PAD + (path.length - 1) * ROW_H;
            // Unique key forces remount → restarts SMIL animation
            const animKey = `anim-${mIdx}-${arrived[mIdx] ? "done" : "run"}`;
            const pathId = `ladder-path-${mIdx}-${arrived[mIdx] ? "done" : "run"}`;
            return (
              <g key={animKey}>
                {/* Hidden path used as motion reference */}
                <path id={pathId} d={d} fill="none" stroke="none" />
                {/* Trail being drawn */}
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={length}
                  strokeDashoffset={length}
                  opacity={0.85}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from={length}
                    to={0}
                    dur={`${PATH_REVEAL_MS}ms`}
                    fill="freeze"
                    calcMode="spline"
                    keySplines="0.45 0 0.55 1"
                    keyTimes="0;1"
                  />
                </path>
                {/* Traveler emoji following the path */}
                <g>
                  <circle cx={0} cy={0} r={14} fill={color} opacity={0.25}>
                    <animateMotion
                      dur={`${PATH_REVEAL_MS}ms`}
                      begin="0s"
                      fill="freeze"
                      rotate="0"
                      calcMode="linear"
                    >
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                  </circle>
                  <text
                    x={0}
                    y={0}
                    fontSize={22}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))" }}
                  >
                    {traveler}
                    <animateMotion
                      dur={`${PATH_REVEAL_MS}ms`}
                      begin="0s"
                      fill="freeze"
                      rotate="0"
                      calcMode="linear"
                    >
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                  </text>
                </g>
                {/* Arrival burst at the destination */}
                <g transform={`translate(${endX}, ${endY})`} opacity={0}>
                  <circle r={4} fill={color}>
                    <animate
                      attributeName="r"
                      from={4}
                      to={26}
                      dur="600ms"
                      begin={`${PATH_REVEAL_MS - 50}ms`}
                      fill="freeze"
                    />
                    <animate
                      attributeName="opacity"
                      from={0.7}
                      to={0}
                      dur="600ms"
                      begin={`${PATH_REVEAL_MS - 50}ms`}
                      fill="freeze"
                    />
                  </circle>
                  <animate
                    attributeName="opacity"
                    from={0}
                    to={1}
                    dur="50ms"
                    begin={`${PATH_REVEAL_MS - 50}ms`}
                    fill="freeze"
                  />
                </g>
              </g>
            );
          })()}
          {/* Persistent arrival markers for finished members (no active animation) */}
          {run && activeMember === null &&
            members.map((member, mIdx) => {
              if (!arrived[mIdx]) return null;
              const path = run.paths[mIdx];
              const endX = path[path.length - 1] * COL_W + COL_W / 2;
              const endY = TOP_PAD + (path.length - 1) * ROW_H;
              const color = TRACK_COLORS[mIdx % TRACK_COLORS.length];
              const traveler = TRAVELERS[mIdx % TRAVELERS.length];
              return (
                <g key={`arrived-${member.id}`} transform={`translate(${endX}, ${endY})`}>
                  <circle r={14} fill={color} opacity={0.2} />
                  <text fontSize={22} textAnchor="middle" dominantBaseline="central">
                    {traveler}
                  </text>
                </g>
              );
            })}
        </svg>

        {/* Cloud cover overlay */}
        <div
          className={`absolute inset-x-0 top-[0%] h-[100%] transition-all duration-1000 ease-out ${
            cloudsLifted ? "pointer-events-none opacity-0 blur-md -translate-y-3 scale-105" : "opacity-100"
          }`}
          aria-hidden
        >
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full animate-cloud-drift-slow"
            viewBox="0 0 400 200"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="cloudFill" cx="50%" cy="50%" r="65%">
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="60%" stopColor="white" stopOpacity="1" />
                <stop offset="85%" stopColor="white" stopOpacity="0.7" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
              <filter id="cloudBlur" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>
            <g fill="url(#cloudFill)" filter="url(#cloudBlur)" className="animate-cloud-drift">
              <ellipse cx="50" cy="60" rx="65" ry="42" />
              <ellipse cx="140" cy="50" rx="75" ry="46" />
              <ellipse cx="225" cy="65" rx="80" ry="48" />
              <ellipse cx="310" cy="52" rx="72" ry="44" />
              <ellipse cx="370" cy="70" rx="65" ry="42" />
              <ellipse cx="60" cy="100" rx="68" ry="42" />
              <ellipse cx="150" cy="105" rx="72" ry="44" />
              <ellipse cx="240" cy="100" rx="78" ry="46" />
              <ellipse cx="330" cy="105" rx="70" ry="44" />
              <ellipse cx="100" cy="145" rx="70" ry="40" />
              <ellipse cx="200" cy="150" rx="78" ry="42" />
              <ellipse cx="300" cy="145" rx="72" ry="40" />
              <ellipse cx="370" cy="150" rx="60" ry="38" />
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <button
              type="button"
              onClick={startGame}
              disabled={activeMember !== null}
              className="pointer-events-auto rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              ☁️ {t("startLadder", lang)} ▶︎
            </button>
          </div>
        </div>
        </div>

        {/* Bottom: editable slots */}
        <div
          className="mt-3 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.min(columnCount, 4)}, minmax(0, 1fr))` }}
        >
          {slots.map((slot, i) => (
            <div key={`slot-${i}`} className="rounded-xl border border-border bg-background p-2">
              <div className="mb-1 truncate text-center text-[10px] font-semibold text-muted-foreground">
                <span className="mr-0.5">{TRAVELERS[i % TRAVELERS.length]}</span>
                {members[i]?.name ?? `#${i + 1}`}
              </div>
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

/**
 * Build a Naver-style polyline from a column-walk: vertical down, horizontal across rung, vertical down...
 * `path[i]` = column position AFTER row i is processed; path[0] = start column.
 */
function buildPolyline(path: number[]): string {
  const pts: string[] = [];
  // Start at top of starting column
  pts.push(`${path[0] * COL_W + COL_W / 2},${TOP_PAD}`);
  for (let i = 1; i < path.length; i++) {
    const prevCol = path[i - 1];
    const curCol = path[i];
    const rowMidY = TOP_PAD + (i - 1) * ROW_H + ROW_H / 2;
    if (prevCol !== curCol) {
      // come down to mid of this row on previous column
      pts.push(`${prevCol * COL_W + COL_W / 2},${rowMidY}`);
      // cross rung horizontally to current column
      pts.push(`${curCol * COL_W + COL_W / 2},${rowMidY}`);
    }
    // descend to bottom of this row in current column
    pts.push(`${curCol * COL_W + COL_W / 2},${TOP_PAD + i * ROW_H}`);
  }
  return pts.join(" ");
}

/** Same waypoints as buildPolyline but as an SVG path "M x,y L x,y ..." string for animateMotion. */
function buildSvgPath(path: number[]): string {
  const pts: Array<[number, number]> = [];
  pts.push([path[0] * COL_W + COL_W / 2, TOP_PAD]);
  for (let i = 1; i < path.length; i++) {
    const prevCol = path[i - 1];
    const curCol = path[i];
    const rowMidY = TOP_PAD + (i - 1) * ROW_H + ROW_H / 2;
    if (prevCol !== curCol) {
      pts.push([prevCol * COL_W + COL_W / 2, rowMidY]);
      pts.push([curCol * COL_W + COL_W / 2, rowMidY]);
    }
    pts.push([curCol * COL_W + COL_W / 2, TOP_PAD + i * ROW_H]);
  }
  return pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
}

function estimateLength(path: number[]): number {
  // Rough overestimate so dasharray fully hides initially
  return (path.length * ROW_H + path.length * COL_W) * 2;
}
