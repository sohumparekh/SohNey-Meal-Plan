"use client";
import { useState, useTransition } from "react";
import { eatingOutAction, planBAction, rateAction, servingsAction } from "@/app/actions";
import { SwapSheet, type DishLite } from "./SwapSheet";
import { SLOT_LABEL } from "./ui";
import { SendToCook } from "./SendToCook";

export interface MealCardProps {
  date: string;
  dateLabel: string;
  slot: "breakfast" | "lunch" | "dinner";
  dish: { id: string; nameEn: string; nameCook: string; cuisine: string; effort: string } | null;
  planBName: string | null;
  planBActive: boolean;
  skipped: boolean;
  servings: number;
  servingsDefault: number;
  prepNote?: string | null;
  warning?: string | null;
  canRate: boolean;
  rating: number;
  allDishes: DishLite[];
  compact?: boolean;
}

type EatOut = Awaited<ReturnType<typeof eatingOutAction>>;

export function MealCard(p: MealCardProps) {
  const [swap, setSwap] = useState(false);
  const [pending, start] = useTransition();
  const [eatOut, setEatOut] = useState<EatOut | null>(null);
  const [rated, setRated] = useState<0 | 1 | -1>(0);

  return (
    <div className={`rounded-2xl border border-line bg-card shadow-sm ${p.compact ? "p-3" : "p-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">{SLOT_LABEL[p.slot]}</div>
          {p.skipped ? (
            <div className="mt-1 text-lg font-semibold">Eating out <span className="text-sm font-normal text-muted">(was {p.dish?.nameEn})</span></div>
          ) : (
            <>
              <div className={`mt-1 font-semibold leading-snug ${p.compact ? "text-base" : "text-lg"}`}>
                {p.planBActive ? p.planBName : p.dish?.nameEn ?? "Not planned"}
                {p.planBActive && <span className="ml-2 rounded bg-warn-bg px-1.5 py-0.5 text-xs text-warn-ink">Plan B</span>}
              </div>
              {!p.compact && p.dish && (
                <div className="text-sm text-muted">
                  {p.planBActive ? `instead of ${p.dish.nameEn}` : `Plan B: ${p.planBName}`}
                </div>
              )}
            </>
          )}
        </div>
        {!p.skipped && p.servings !== p.servingsDefault && (
          <span className="shrink-0 rounded-full bg-soft px-2 py-1 text-xs font-medium">{p.servings} people</span>
        )}
      </div>

      {p.prepNote && !p.skipped && <div className="mt-2 rounded-lg bg-soft px-3 py-2 text-sm">📌 {p.prepNote}</div>}
      {p.warning && !p.skipped && <div className="mt-2 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-ink">⚠️ {p.warning}</div>}

      <div className="mt-3 flex gap-2">
        {!p.skipped && (
          <button onClick={() => setSwap(true)} className="h-11 flex-1 rounded-xl bg-brand px-4 font-semibold text-brand-ink active:opacity-80">
            Swap
          </button>
        )}
        <button
          disabled={pending || !p.dish}
          onClick={() => start(async () => setEatOut(await eatingOutAction(p.date, p.slot)))}
          className="h-11 flex-1 whitespace-nowrap rounded-xl border border-line px-4 font-medium active:bg-soft disabled:opacity-50"
        >
          {p.skipped ? "Undo eating out" : "Eating out"}
        </button>
      </div>
      <div className="mt-2 flex gap-2 empty:hidden">
        {!p.compact && !p.skipped && (
          <>
            <button
              disabled={pending}
              onClick={() => start(() => planBAction(p.date, p.slot, !p.planBActive))}
              className="h-11 flex-1 rounded-xl border border-line px-3 text-sm active:bg-soft"
            >
              {p.planBActive ? "Back to plan" : "Use Plan B"}
            </button>
            <div className="flex h-11 items-center rounded-xl border border-line">
              <button aria-label="Fewer people" className="h-full w-10 text-lg" onClick={() => start(() => servingsAction(p.date, p.slot, p.servings - 1))}>−</button>
              <span className="w-6 text-center text-sm">{p.servings}</span>
              <button aria-label="More people" className="h-full w-10 text-lg" onClick={() => start(() => servingsAction(p.date, p.slot, p.servings + 1))}>+</button>
            </div>
          </>
        )}
      </div>

      {p.canRate && p.dish && !p.skipped && (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <span>How was it?</span>
          {([1, -1] as const).map((d) => (
            <button
              key={d}
              disabled={rated !== 0}
              onClick={() => { setRated(d); start(() => rateAction(p.dish!.id, d)); }}
              className={`h-9 w-11 rounded-lg border border-line text-lg ${rated === d ? "bg-soft" : ""}`}
            >
              {d === 1 ? "👍" : "👎"}
            </button>
          ))}
          {rated !== 0 && <span>Thanks, noted.</span>}
        </div>
      )}

      {eatOut && !eatOut.undone && (
        <div className="mt-3 space-y-2 rounded-xl bg-soft p-3 text-sm">
          {eatOut.moved && <p>Moved {eatOut.moved.dish} to {eatOut.moved.date} {eatOut.moved.slot}, so its fresh items get used.</p>}
          {eatOut.stranded.length > 0 && <p>Use soon: {eatOut.stranded.join(", ")} (no later slot fits).</p>}
          <SendToCook compact label="Tell the cook" text={eatOut.text} link={eatOut.link} kind="eating_out" forDate={p.date} />
        </div>
      )}

      {swap && <SwapSheet date={p.date} slot={p.slot} dateLabel={p.dateLabel} allDishes={p.allDishes} onClose={() => setSwap(false)} />}
    </div>
  );
}
