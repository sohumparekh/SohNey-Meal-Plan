// "We're eating out": cancel a meal and move its fresh ingredients to a later meal.
//
// The cancelled dish takes the place of the next meal in the same planning week that
//   - is a slot the dish can be served in, and its effort fits that day,
//   - is still within the shelf life of every fresh ingredient (same delivery window),
//   - currently holds a staples-only dish (so dropping that dish wastes nothing).
// If no such meal exists the dish is just skipped and the fresh items are reported, so
// the app can warn "use paneer by Sun".

import { dayInWeek, weekDates, weekStartFor, type ISODate } from "./dates";
import { isStaplesOnly, perishablesOf, windowForDay } from "./shelf";
import { effortAllowed } from "./suggest";
import { SLOTS, mealKey, type Meal, type PlannerData } from "./types";

export interface EatingOutResult {
  skipped: Meal;
  moved?: { to: Meal; replacedDishId: string };
  /** Fresh items that could not be moved anywhere. */
  stranded: string[];
}

export function planEatingOut(data: PlannerData, weekMeals: Meal[], date: ISODate, slot: Meal["slot"]): EatingOutResult {
  const byKey: Record<string, Meal> = Object.fromEntries(weekMeals.map((m) => [mealKey(m.date, m.slot), m]));
  const meal = byKey[mealKey(date, slot)];
  if (!meal) throw new Error(`No meal on ${date} ${slot}`);
  const skipped: Meal = { ...meal, status: "skipped" };
  const dish = data.dishes[meal.dishId];
  const fresh = dish ? perishablesOf(dish, data.ingredients) : [];
  if (!dish || fresh.length === 0) return { skipped, stranded: [] };

  const k0 = dayInWeek(date);
  const windowOf = (k: number) =>
    fresh.map((i) => windowForDay(data.ingredients[i.ingredientId], k, data.settings.topupEnabled));
  const originalWindows = windowOf(k0);

  const laterSlots: { d: ISODate; s: Meal["slot"] }[] = [];
  for (const d of weekDates(weekStartFor(date))) {
    if (d < date) continue;
    for (const s of SLOTS) {
      if (d === date && SLOTS.indexOf(s) <= SLOTS.indexOf(slot)) continue;
      laterSlots.push({ d, s });
    }
  }

  for (const { d, s } of laterSlots) {
    if (!dish.slots.includes(s) || !effortAllowed(dish, d)) continue;
    const target = byKey[mealKey(d, s)];
    if (!target || target.status === "skipped") continue;
    const targetDish = data.dishes[target.dishId];
    if (!targetDish || !isStaplesOnly(targetDish, data.ingredients)) continue;
    const w = windowOf(dayInWeek(d));
    if (w.some((x, i) => x === null || x !== originalWindows[i])) continue;
    return {
      skipped,
      moved: {
        to: { ...target, dishId: dish.id, status: "swapped", planB: false, originalDishId: target.originalDishId ?? target.dishId },
        replacedDishId: target.dishId,
      },
      stranded: [],
    };
  }
  // only report what can actually spoil (a packet of noodles can wait)
  const stranded = fresh.map((i) => i.ingredientId).filter((id) => data.ingredients[id].shelfLifeDays <= 14);
  return { skipped, stranded: [...new Set(stranded)] };
}
