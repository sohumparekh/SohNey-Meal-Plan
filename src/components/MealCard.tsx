import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { getMealsMap, rateDish, restoreMeal, setAltDish, setPlanB, setServings, toggleEatingOut, toggleSide } from "@/data/repo";
import { eatingOutMessage, waLink } from "@/lib/core/cookMessages";
import { mealKey, type Meal } from "@/lib/core/types";
import { SIDES } from "@/lib/seed/sides";
import { haptic } from "@/native/haptics";
import { Glass, Press, rise, spring, useToast } from "@/ui/glass";
import { SendToCook } from "./SendToCook";
import { SwapSheet, type DishLite } from "./SwapSheet";
import { SLOT_EMOJI, SLOT_LABEL } from "./ui";

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
  /** Egg breakfast: who eats what. */
  split?: { eggEater: string; nonEggEater: string; altId: string; altName: string } | null;
  sides: string[];
}

interface EatOut { text: string; link: string; moved: { date: string; slot: string; dish: string } | null; stranded: string[] }

async function snapshot(date: string, slot: MealCardProps["slot"]): Promise<Meal | undefined> {
  return (await getMealsMap(date, date))[mealKey(date, slot)];
}

export function MealCard(p: MealCardProps) {
  const toast = useToast();
  const [swap, setSwap] = useState<null | "main" | "alt">(null);
  const [eatOut, setEatOut] = useState<EatOut | null>(null);
  const [rated, setRated] = useState<0 | 1 | -1>(0);
  const [more, setMore] = useState(false);

  /** Run a change and offer Undo that puts the meal back exactly. */
  async function withUndo(label: string, change: () => Promise<unknown>) {
    const before = await snapshot(p.date, p.slot);
    await change();
    if (before) toast({ text: label, undo: async () => { await restoreMeal(before); setEatOut(null); } });
  }

  async function eatingOut() {
    const before = await snapshot(p.date, p.slot);
    const r = await toggleEatingOut(p.date, p.slot);
    if (r.undone) { setEatOut(null); toast({ text: "Back on the menu" }); return; }
    const text = eatingOutMessage(r.data, r.meal, r.moved?.to);
    setEatOut({
      text,
      link: waLink(r.data.settings.cookPhone, text),
      moved: r.moved ? { date: r.moved.to.date, slot: r.moved.to.slot, dish: r.data.dishes[r.moved.to.dishId].nameEn } : null,
      stranded: (r.stranded ?? []).map((id) => r.data.ingredients[id]?.nameEn ?? id),
    });
    const movedTo = r.moved?.to;
    const replaced = r.moved?.replacedDishId;
    toast({
      text: r.moved ? `Eating out · ${r.data.dishes[r.meal.dishId]?.nameEn} moved` : "Marked as eating out",
      undo: async () => {
        if (before) await restoreMeal(before);
        if (movedTo && replaced) {
          const orig = movedTo.originalDishId === replaced;
          await restoreMeal({ ...movedTo, dishId: replaced, status: orig ? "planned" : "swapped", originalDishId: orig ? null : movedTo.originalDishId });
        }
        setEatOut(null);
      },
    });
  }

  const title = p.planBActive ? p.planBName : p.dish?.nameEn ?? "Not planned";

  return (
    <Glass variants={rise} className={p.compact ? "p-3.5" : "p-4"}>
      <div className="relative z-[2]">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
            <span className="text-[14px]">{SLOT_EMOJI[p.slot]}</span> {SLOT_LABEL[p.slot]}
          </span>
          <span className="flex items-center gap-1.5">
            {p.planBActive && <Tag tone="warn">Plan B</Tag>}
            {!p.skipped && p.servings !== p.servingsDefault && <Tag>{p.servings} people</Tag>}
            {!p.compact && p.dish && <Tag>{p.dish.effort}</Tag>}
          </span>
        </div>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${p.skipped}-${title}-${p.split?.altId}`}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
            exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            transition={spring}
            className="mt-1.5"
          >
            {p.skipped ? (
              <div className="text-[19px] font-bold tracking-tight text-muted">
                Eating out <span className="text-[13px] font-medium">· was {p.dish?.nameEn}</span>
              </div>
            ) : p.split && !p.planBActive ? (
              <div className="space-y-1.5">
                <PersonRow who={p.split.eggEater} dish={p.dish?.nameEn ?? ""} onSwap={() => setSwap("main")} compact={p.compact} egg />
                <PersonRow who={p.split.nonEggEater} dish={p.split.altName} onSwap={() => setSwap("alt")} compact={p.compact} />
              </div>
            ) : (
              <div className={`font-bold leading-snug tracking-[-0.02em] ${p.compact ? "text-[17px]" : "text-[21px]"}`}>{title}</div>
            )}
            {!p.compact && p.dish && !p.skipped && (
              <div className="mt-0.5 text-[13px] text-muted">
                {p.planBActive ? `instead of ${p.dish.nameEn}` : p.split ? `Plan B: ${p.split.altName} for both` : `Plan B · ${p.planBName}`}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {p.sides.length > 0 && !p.skipped && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.sides.map((id) => {
              const s = SIDES.find((x) => x.id === id);
              return s ? <Tag key={id}>{s.emoji} {s.nameEn}</Tag> : null;
            })}
          </div>
        )}

        {p.prepNote && !p.skipped && (
          <div className="mt-2.5 rounded-2xl bg-white/35 px-3 py-2 text-[13px] leading-snug dark:bg-white/5">📌 {p.prepNote}</div>
        )}
        {p.warning && !p.skipped && (
          <div className="mt-2.5 rounded-2xl px-3 py-2 text-[13px] leading-snug text-warn-ink" style={{ background: "var(--warn-bg)" }}>⚠️ {p.warning}</div>
        )}

        <div className="mt-3 flex gap-2">
          {!p.skipped && !p.split && (
            <Press variant="brand" size={p.compact ? "sm" : "md"} className="flex-1" onClick={() => setSwap("main")}>
              Swap
            </Press>
          )}
          <Press size={p.compact ? "sm" : "md"} className="flex-1 whitespace-nowrap" disabled={!p.dish} onClick={eatingOut}>
            {p.skipped ? "Undo eating out" : "Eating out"}
          </Press>
          {!p.compact && !p.skipped && (
            <Press size="md" className="w-12 !px-0" aria-label="More" onClick={() => setMore((m) => !m)} haptics="select">
              <motion.svg viewBox="0 0 24 24" className="h-5 w-5" animate={{ rotate: more ? 180 : 0 }} transition={spring} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <path d="M6 9l6 6 6-6" />
              </motion.svg>
            </Press>
          )}
        </div>

        <AnimatePresence initial={false}>
          {more && !p.compact && !p.skipped && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-3">
                <div className="flex gap-2">
                  <Press size="sm" className="flex-1" onClick={() => withUndo(p.planBActive ? "Back to the plan" : "Switched to Plan B", () => setPlanB(p.date, p.slot, !p.planBActive))}>
                    {p.planBActive ? "Back to plan" : "Use Plan B"}
                  </Press>
                  <div className="btn-glass flex h-10 items-center rounded-2xl">
                    <button aria-label="Fewer people" className="h-full w-10 text-lg font-semibold" onClick={() => { haptic.select(); setServings(p.date, p.slot, p.servings - 1); }}>−</button>
                    <motion.span key={p.servings} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-14 text-center text-[13px] font-semibold">{p.servings} ppl</motion.span>
                    <button aria-label="More people" className="h-full w-10 text-lg font-semibold" onClick={() => { haptic.select(); setServings(p.date, p.slot, p.servings + 1); }}>+</button>
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Sides</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SIDES.map((s) => {
                      const on = p.sides.includes(s.id);
                      return (
                        <motion.button
                          key={s.id}
                          whileTap={{ scale: 0.92 }}
                          transition={spring}
                          onClick={() => { haptic.select(); toggleSide(p.date, p.slot, s.id); }}
                          className={`h-9 rounded-full px-3 text-[13px] font-semibold transition-colors ${on ? "btn-brand" : "btn-glass text-ink"}`}
                        >
                          {s.emoji} {s.nameEn}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {p.canRate && p.dish && !p.skipped && !p.compact && (
          <div className="mt-3 flex items-center gap-2 text-[13px] text-muted">
            <span>How was it?</span>
            {([1, -1] as const).map((d) => (
              <motion.button
                key={d}
                whileTap={{ scale: 0.8, rotate: d === 1 ? -12 : 12 }}
                animate={rated === d ? { scale: [1, 1.35, 1] } : {}}
                disabled={rated !== 0}
                onClick={() => { haptic.success(); setRated(d); rateDish(p.dish!.id, d); }}
                className={`h-9 w-11 rounded-xl text-lg ${rated === d ? "btn-glass" : ""} disabled:opacity-60`}
              >
                {d === 1 ? "👍" : "👎"}
              </motion.button>
            ))}
            <AnimatePresence>{rated !== 0 && <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>Noted</motion.span>}</AnimatePresence>
          </div>
        )}

        <AnimatePresence>
          {eatOut && p.skipped && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 space-y-2 rounded-2xl bg-white/30 p-3 text-[13px] dark:bg-white/5">
              {eatOut.moved && <p>Moved {eatOut.moved.dish} to {eatOut.moved.date} {eatOut.moved.slot}, so its fresh items get used.</p>}
              {eatOut.stranded.length > 0 && <p>Use soon: {eatOut.stranded.join(", ")} (no later slot fits).</p>}
              <SendToCook compact label="Tell the cook" text={eatOut.text} link={eatOut.link} kind="eating_out" forDate={p.date} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SwapSheet
        open={swap !== null}
        date={p.date}
        slot={p.slot}
        mode={swap === "alt" ? "alt" : "main"}
        forWho={swap === "alt" ? p.split?.nonEggEater : swap === "main" && p.split ? p.split.eggEater : undefined}
        dateLabel={p.dateLabel}
        allDishes={p.allDishes}
        onClose={() => setSwap(null)}
        onPicked={async (id, name, before) => {
          if (swap === "alt") await setAltDish(p.date, p.slot, id);
          toast({ text: `Swapped to ${name}`, undo: before ? () => restoreMeal(before) : undefined });
        }}
        snapshot={() => snapshot(p.date, p.slot)}
      />
    </Glass>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: "warn" }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone === "warn" ? "text-warn-ink" : "text-muted"}`}
      style={{ background: tone === "warn" ? "var(--warn-bg)" : "rgba(255,255,255,.4)" }}
    >
      {children}
    </span>
  );
}

function PersonRow({ who, dish, onSwap, compact, egg }: { who: string; dish: string; onSwap: () => void; compact?: boolean; egg?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={() => { haptic.tap(); onSwap(); }} className="flex w-full items-center gap-2.5 rounded-2xl bg-white/30 px-3 py-2 text-left dark:bg-white/5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px]" style={{ background: egg ? "linear-gradient(135deg,#ffe29a,#ffc25c)" : "linear-gradient(135deg,#c8f5d4,#86e0a6)" }}>
        {egg ? "🍳" : "🌿"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{who}</span>
        <span className={`block font-bold leading-tight tracking-tight ${compact ? "text-[15px]" : "text-[17px]"}`}>{dish}</span>
      </span>
      <span className="text-[12px] font-semibold text-brand">Swap</span>
    </motion.button>
  );
}
