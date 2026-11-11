"use client";
import { useState, useTransition } from "react";
import { approveWeekAction, redraftWeekAction } from "@/app/actions";
import { SwapSheet, type DishLite } from "./SwapSheet";

export interface WeekCell {
  slot: "breakfast" | "lunch" | "dinner";
  name: string;
  skipped: boolean;
  planB: boolean;
  prep: boolean;
  topup: boolean;
  changed: boolean;
}
export interface WeekRow { date: string; label: string; isToday: boolean; past: boolean; cells: WeekCell[] }

export function WeekGrid({
  weekStart, rows, status, allDishes, canRedraft,
}: { weekStart: string; rows: WeekRow[]; status: "draft" | "approved"; allDishes: DishLite[]; canRedraft: boolean }) {
  const [open, setOpen] = useState<{ date: string; label: string; slot: WeekCell["slot"] } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.date} className={`rounded-2xl border bg-card p-3 ${r.isToday ? "border-brand" : "border-line"} ${r.past ? "opacity-60" : ""}`}>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-bold">{r.label}</span>
            {r.isToday && <span className="text-xs font-semibold text-brand">TODAY</span>}
          </div>
          <div className="grid gap-1.5">
            {r.cells.map((c) => (
              <button
                key={c.slot}
                disabled={r.past}
                onClick={() => setOpen({ date: r.date, label: r.label, slot: c.slot })}
                className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-left active:bg-soft"
              >
                <span className="w-9 shrink-0 text-[11px] font-semibold uppercase text-muted">{c.slot === "breakfast" ? "B'fast" : c.slot === "lunch" ? "Lunch" : "Dinner"}</span>
                <span className={`flex-1 ${c.skipped ? "text-muted line-through" : ""}`}>
                  {c.name}
                  {c.planB && <span className="ml-1 rounded bg-warn-bg px-1 text-[11px] text-warn-ink">Plan B</span>}
                  {c.prep && <span title="Prep the day before" className="ml-1">★</span>}
                  {c.topup && <span title="Needs Tuesday top-up" className="ml-1 text-xs text-muted">(top-up)</span>}
                  {c.changed && <span className="ml-1 text-[11px] text-brand">swapped</span>}
                </span>
                <span className="text-muted">›</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] space-y-2 bg-bg/95 py-3 backdrop-blur">
        {status === "draft" ? (
          <button
            disabled={pending}
            onClick={() => start(() => approveWeekAction(weekStart))}
            className="h-14 w-full rounded-xl bg-brand text-lg font-bold text-brand-ink active:opacity-80 disabled:opacity-50"
          >
            {pending ? "Approving…" : "Approve week → shopping lists"}
          </button>
        ) : (
          <p className="text-center text-sm text-ok">✓ Approved. Shopping lists are ready.</p>
        )}
        {canRedraft && (
          <button
            disabled={pending}
            onClick={() => { if (confirm("Start this week again from the rotation? Your swaps will be lost.")) start(() => redraftWeekAction(weekStart)); }}
            className="h-10 w-full text-sm text-muted underline"
          >
            Start again from the rotation
          </button>
        )}
      </div>

      {open && <SwapSheet date={open.date} slot={open.slot} dateLabel={open.label} allDishes={allDishes} onClose={() => setOpen(null)} />}
    </div>
  );
}
