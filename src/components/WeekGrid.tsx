import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { approveWeek, getMealsMap, redraftWeek, restoreMeal } from "@/data/repo";
import { mealKey } from "@/lib/core/types";
import { haptic } from "@/native/haptics";
import { Glass, Press, rise, spring, useToast } from "@/ui/glass";
import { SwapSheet, type DishLite } from "./SwapSheet";
import { SLOT_EMOJI } from "./ui";

export interface WeekCell {
  slot: "breakfast" | "lunch" | "dinner";
  name: string;
  altName?: string | null;
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
  const [justApproved, setJustApproved] = useState(false);
  const toast = useToast();
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Glass key={r.date} variants={rise} className={`p-3 ${r.past ? "opacity-60" : ""}`} style={r.isToday ? { boxShadow: "inset 0 0 0 1.5px var(--brand), var(--glass-shadow)" } : undefined}>
          <div className="relative z-[2]">
            <div className="mb-1 flex items-baseline justify-between px-1">
              <span className="text-[15px] font-extrabold tracking-tight">{r.label}</span>
              {r.isToday && <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand">Today</span>}
            </div>
            {r.cells.map((c) => (
              <motion.button
                key={c.slot}
                whileTap={r.past ? undefined : { scale: 0.98 }}
                transition={spring}
                disabled={r.past}
                onClick={() => { haptic.tap(); setOpen({ date: r.date, label: r.label, slot: c.slot }); }}
                className="flex min-h-[46px] w-full items-center gap-3 rounded-2xl px-2 text-left active:bg-white/30"
              >
                <span className="w-6 text-center text-[16px]">{SLOT_EMOJI[c.slot]}</span>
                <span className={`min-w-0 flex-1 text-[15px] leading-tight ${c.skipped ? "text-muted line-through" : "font-semibold"}`}>
                  {c.altName ? <>🍳 {c.name} <span className="font-normal text-muted">·</span> 🌿 {c.altName}</> : c.name}
                  <span className="ml-1 inline-flex gap-1 align-middle">
                    {c.planB && <Chip tone="warn">Plan B</Chip>}
                    {c.prep && <Chip>★ prep</Chip>}
                    {c.topup && <Chip>top-up</Chip>}
                    {c.changed && <Chip tone="brand">swapped</Chip>}
                  </span>
                </span>
                {!r.past && <span className="text-[18px] text-[var(--faint)]">›</span>}
              </motion.button>
            ))}
          </div>
        </Glass>
      ))}

      <div className={`z-20 space-y-2 py-3 ${status === "draft" ? "sticky" : ""}`} style={{ bottom: "calc(var(--sab) + 96px)" }}>
        <AnimatePresence mode="wait" initial={false}>
          {status === "draft" ? (
            <motion.div key="draft" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring}>
              <Press
                variant="brand"
                size="lg"
                haptics="success"
                className="w-full"
                onClick={async () => { await approveWeek(weekStart); setJustApproved(true); toast({ text: "Week approved · shopping lists ready" }); }}
              >
                Approve week · make shopping lists
              </Press>
            </motion.div>
          ) : (
            <motion.div
              key="approved"
              initial={justApproved ? { scale: 0.6, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 16 }}
              className="glass-strong mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[13px] text-white" style={{ background: "linear-gradient(135deg,#3ee07d,var(--ok))" }}>✓</span>
              Approved · shopping lists are ready
            </motion.div>
          )}
        </AnimatePresence>
        {canRedraft && (
          <button
            onClick={async () => {
              if (!confirm("Start this week again from the rotation? Your swaps will be lost.")) return;
              const before = Object.values(await getMealsMap(weekStart, rows[rows.length - 1].date));
              await redraftWeek(weekStart);
              haptic.press();
              toast({ text: "Redrafted from the rotation", undo: async () => { for (const m of before) await restoreMeal(m); } });
            }}
            className="mx-auto block h-9 text-[13px] font-semibold text-muted"
          >
            Start again from the rotation
          </button>
        )}
      </div>

      <SwapSheet
        open={!!open}
        date={open?.date ?? weekStart}
        slot={open?.slot ?? "lunch"}
        dateLabel={open?.label ?? ""}
        allDishes={allDishes}
        onClose={() => setOpen(null)}
        snapshot={async () => (open ? (await getMealsMap(open.date, open.date))[mealKey(open.date, open.slot)] : undefined)}
        onPicked={(_, name, before) => toast({ text: `Swapped to ${name}`, undo: before ? () => restoreMeal(before) : undefined })}
      />
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "warn" | "brand" }) {
  const style = tone === "warn" ? { background: "var(--warn-bg)", color: "var(--warn-ink)" } : tone === "brand" ? { color: "var(--brand)", background: "rgba(242,102,42,.12)" } : { background: "rgba(255,255,255,.4)", color: "var(--muted)" };
  return <span className="rounded-full px-1.5 py-[1px] text-[10px] font-bold" style={style}>{children}</span>;
}
