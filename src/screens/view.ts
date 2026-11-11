// Shapes planner data into props for components.
import { useLiveQuery } from "dexie-react-hooks";
import type { MealCardProps } from "@/components/MealCard";
import type { DishLite } from "@/components/SwapSheet";
import { dayInWeek, nowIST, prettyDate, type ISODate } from "@/lib/core/dates";
import { needsTopup, shelfFeasible } from "@/lib/core/shelf";
import { mealKey, type Meal, type PlannerData, type Slot } from "@/lib/core/types";

/** Re-runs `fn` whenever the data it read changes (any screen, any write). */
export function useLive<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  return useLiveQuery(fn, deps);
}

export function dishLites(data: PlannerData): DishLite[] {
  return Object.values(data.dishes)
    .filter((d) => d.active !== false)
    .map((d) => ({ id: d.id, nameEn: d.nameEn, nameCook: d.nameCook, slots: d.slots }))
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}

export function mealCardProps(
  data: PlannerData,
  meals: Record<string, Meal>,
  date: ISODate,
  slot: Slot,
  opts: { atRisk?: Map<string, string[]>; allDishes: DishLite[]; compact?: boolean },
): MealCardProps {
  const m = meals[mealKey(date, slot)];
  const dish = m ? data.dishes[m.dishId] : undefined;
  const planB = dish ? data.dishes[dish.planBId] : undefined;
  const k = dayInWeek(date);
  let warning: string | null = null;
  const risk = opts.atRisk?.get(mealKey(date, slot));
  if (risk?.length) warning = `${risk.join(", ")} not at home. Use Plan B or top up.`;
  else if (dish && !shelfFeasible(dish, k, data.ingredients, data.settings.topupEnabled))
    warning = "A fresh item will be too old by this day. Buy it fresh or swap.";
  else if (dish && needsTopup(dish, k, data.ingredients)) warning = "Needs a fresh item from the Tuesday top-up.";

  const now = nowIST();
  const mealPassed = date < now.date || (date === now.date && now.hour >= data.settings.mealHours[slot] + 1);
  return {
    date,
    dateLabel: prettyDate(date),
    slot,
    dish: dish ? { id: dish.id, nameEn: dish.nameEn, nameCook: dish.nameCook, cuisine: dish.cuisine, effort: dish.effort } : null,
    planBName: planB?.nameEn ?? null,
    planBActive: !!m?.planB,
    skipped: m?.status === "skipped",
    servings: m?.servings ?? data.settings.servingsDefault,
    servingsDefault: data.settings.servingsDefault,
    prepNote: dish?.prepAhead ? `Needs prep the day before: ${dish.prepAhead.en.toLowerCase()}` : null,
    warning,
    canRate: mealPassed,
    rating: dish?.rating ?? 0,
    allDishes: opts.allDishes,
    compact: opts.compact,
  };
}

export function sentLabel(iso: string | undefined | null) {
  if (!iso) return null;
  const n = nowIST(new Date(iso));
  return `${prettyDate(n.date)} ${n.hhmm}`;
}

/** Evening whose "tomorrow" message is relevant now (after midnight, still last night's). */
export function currentEvening(): ISODate {
  const n = nowIST();
  if (n.hour < 5) {
    const d = new Date(`${n.date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  return n.date;
}

export const Loading = () => null;
