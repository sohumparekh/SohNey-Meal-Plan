// Shapes planner data into props for the client components.
import "server-only";
import type { MealCardProps } from "@/components/MealCard";
import type { DishLite } from "@/components/SwapSheet";
import { dayInWeek, nowIST, prettyDate, type ISODate } from "./core/dates";
import { shelfFeasible, needsTopup } from "./core/shelf";
import { mealKey, type Meal, type PlannerData, type Slot } from "./core/types";

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

export function sentLabel(createdAt: Date | undefined) {
  if (!createdAt) return null;
  const n = nowIST(createdAt);
  return `${prettyDate(n.date)} ${n.hhmm}`;
}
