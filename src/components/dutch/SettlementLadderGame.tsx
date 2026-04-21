import { useMemo, useState } from "react";
import { Dices, Play, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { t, type Lang } from "@/lib/i18n";

interface LadderMember {
  id: string;
  name: string;
}

interface SettlementLadderGameProps {
  lang: Lang;
  members: LadderMember[];
}

type LadderRun = {
  paths: number[][];
  winnerIndex: number;
};

export default function SettlementLadderGame({ lang, members }: SettlementLadderGameProps) {
  const [run, setRun] = useState<LadderRun | null>(null);

  const columnCount = members.length;
  const rowCount = Math.max(5, members.length + 2);

  const startGame = () => {
    if (members.length < 2) return;
    const rungs = Array.from({ length: rowCount }, () => Array.from({ length: Math.max(0, columnCount - 1) }, () => Math.random() > 0.58));

    const paths = members.map((_, startIndex) => {
      let col = startIndex;
      const steps = [col];

      rungs.forEach((row) => {
        if (col > 0 && row[col - 1]) {
          col -= 1;
        } else if (col < columnCount - 1 && row[col]) {
          col += 1;
        }
        steps.push(col);
      });

      return steps;
    });

    const winnerIndex = Math.floor(Math.random() * members.length);
    setRun({ paths, winnerIndex });
  };

  const winner = run ? members[run.winnerIndex] : null;

  const rails = useMemo(() => Array.from({ length: columnCount }), [columnCount]);
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
        <Button variant="secondary" size="sm" onClick={startGame} className="rounded-xl">
          <Play className="h-3.5 w-3.5" />
          {t("startLadder", lang)}
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-secondary/40 p-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
          {members.map((member, index) => {
            const isWinner = winner?.id === member.id;
            return (
              <div key={member.id} className="text-center">
                <div className={`rounded-xl px-2 py-2 text-xs font-semibold transition-all ${isWinner ? "bg-primary text-primary-foreground shadow-primary" : "bg-background text-foreground"}`}>
                  {member.name}
                </div>
                <div className="mt-3 flex min-h-[220px] justify-center gap-2">
                  {rails[index] !== undefined && (
                    <div className="relative h-full w-full">
                      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
                      {rows.map((_, rowIndex) => {
                        const destination = run?.paths[index]?.[rowIndex + 1];
                        const current = run?.paths[index]?.[rowIndex];
                        const goesRight = destination !== undefined && destination > current;
                        const goesLeft = destination !== undefined && destination < current;

                        return (
                          <div
                            key={`${member.id}-${rowIndex}`}
                            className="absolute left-1/2 h-6 -translate-x-1/2"
                            style={{ top: `${(rowIndex / rowCount) * 100}%` }}
                          >
                            {(goesRight || goesLeft) ? (
                              <div className={`absolute top-1/2 h-px w-[calc(100%+1.25rem)] -translate-y-1/2 bg-primary ${goesLeft ? "right-1/2" : "left-1/2"}`} />
                            ) : null}
                            <div className={`absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${run ? "bg-primary" : "bg-muted"}`} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className={`mt-3 rounded-xl px-2 py-2 text-xs font-semibold ${isWinner ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground"}`}>
                  {isWinner ? t("ladderWinner", lang) : t("ladderWaiting", lang)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {winner ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-3 text-sm font-medium text-foreground">
          <Trophy className="h-4 w-4 text-primary" />
          <span>{winner.name} — {t("ladderWinnerDesc", lang)}</span>
        </div>
      ) : null}
    </section>
  );
}