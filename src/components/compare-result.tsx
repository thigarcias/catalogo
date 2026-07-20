"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus, Trophy } from "lucide-react";
import type { Item } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export type CompareData = {
  winner_id: string | null;
  verdict: string;
  scores: {
    item_id: string;
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
  }[];
  criteria: {
    label: string;
    winner_id: string | null;
    values: { item_id: string; value: string }[];
  }[];
};

/** Contagem crescente até o valor final, para o placar não aparecer estático. */
function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // easeOutCubic: desacelera no fim, dá sensação de "parando no placar".
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function ScoreColumn({
  item,
  score,
  summary,
  strengths,
  weaknesses,
  isWinner,
}: {
  item: Item;
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  isWinner: boolean;
}) {
  const shown = useCountUp(score);

  return (
    <div
      className={`relative flex flex-col rounded-lg border p-4 transition-colors ${
        isWinner ? "border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/15" : ""
      }`}
    >
      {isWinner && (
        <Badge className="absolute -top-2.5 left-4 gap-1 border-amber-400/60 bg-amber-400 text-[10px] text-amber-950 hover:bg-amber-400">
          <Trophy className="size-3" />
          Vence
        </Badge>
      )}

      <div className="mb-3 flex items-start gap-3">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt=""
            className="size-12 shrink-0 rounded object-contain"
          />
        ) : (
          <div className="size-12 shrink-0 rounded bg-muted" />
        )}
        <div className="min-w-0">
          <p className="text-sm leading-snug font-medium">{item.name}</p>
          {summary && (
            <p className="mt-0.5 text-xs text-muted-foreground">{summary}</p>
          )}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-medium tabular-nums">{shown}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${
              isWinner ? "bg-amber-400" : "bg-foreground/30"
            }`}
            style={{ width: `${shown}%` }}
          />
        </div>
      </div>

      <div className="space-y-1">
        {strengths.map((s, i) => (
          <p key={`s${i}`} className="flex gap-1.5 text-xs">
            <Plus className="mt-0.5 size-3 shrink-0 text-emerald-600 dark:text-emerald-500" />
            <span>{s}</span>
          </p>
        ))}
        {weaknesses.map((w, i) => (
          <p key={`w${i}`} className="flex gap-1.5 text-xs">
            <Minus className="mt-0.5 size-3 shrink-0 text-red-600 dark:text-red-500" />
            <span>{w}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function CompareResult({
  data,
  items,
}: {
  data: CompareData;
  items: Item[];
}) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered = data.scores
    .map((s) => ({ ...s, item: byId.get(s.item_id) }))
    .filter((s): s is typeof s & { item: Item } => Boolean(s.item));

  return (
    // min-w-0: o DialogContent é um grid, e item de grid tem min-width:auto —
    // sem isto a tabela estica o diálogo em vez de rolar dentro dele.
    <div className="min-w-0 space-y-6">
      {data.verdict && (
        <div className="flex gap-3 rounded-lg border border-amber-400/50 bg-amber-50/50 p-3 dark:bg-amber-950/20">
          <Trophy className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
          <p className="text-sm leading-relaxed">{data.verdict}</p>
        </div>
      )}

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,220px),1fr))`,
        }}
      >
        {ordered.map((s) => (
          <ScoreColumn
            key={s.item_id}
            item={s.item}
            score={s.score}
            summary={s.summary}
            strengths={s.strengths}
            weaknesses={s.weaknesses}
            isWinner={s.item_id === data.winner_id}
          />
        ))}
      </div>

      {data.criteria.length > 0 && (
        <div className="min-w-0">
          <h4 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Round a round
          </h4>

          <div className="min-w-0 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-3 text-left text-xs font-normal text-muted-foreground">
                    Critério
                  </th>
                  {ordered.map((s) => (
                    <th
                      key={s.item_id}
                      className="max-w-[10rem] truncate py-2 pl-3 text-left text-xs font-medium"
                      title={s.item.name}
                    >
                      {s.item.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.criteria.map((c, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-3 text-xs whitespace-nowrap text-muted-foreground">
                      {c.label}
                    </td>
                    {ordered.map((s) => {
                      const cell = c.values.find(
                        (v) => v.item_id === s.item_id,
                      );
                      const won = c.winner_id === s.item_id;
                      return (
                        <td
                          key={s.item_id}
                          title={cell?.value}
                          className={`py-2 pl-3 text-xs ${
                            won ? "font-medium" : "text-muted-foreground"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {won && (
                              <Check className="size-3 shrink-0 text-emerald-600 dark:text-emerald-500" />
                            )}
                            {cell?.value ?? "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
