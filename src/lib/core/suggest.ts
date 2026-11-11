// Smart swap suggestions: 3 to 5 dishes that fit a given date and slot.
import { addDays, dayInWeek, isWeekendDate, weekDates, weekStartFor, type ISODate } from "./dates";
import { isStaplesOnly, perishablesOf, shelfFeasible, needsTopup } from "./shelf";
import { mealKey, type Dish, type Meal, type PlannerData, type Slot } from "./types";

export interface Suggestion {
  dishId: string;
  score: number;
  reason: string;
}

export interface SuggestContext extends PlannerData {
  /** Meals around the date (at least +-noRepeatDays), keyed by mealKey. */
  meals: Record<string, Meal>;
  /** Week already approved: ingredients are bought, so prefer dishes that reuse them. */
  weekApproved: boolean;
}

/** Dish ids used within `days` of `date` (excluding the given slot on that date). */
export function recentDishIds(meals: Record<string, Meal>, date: ISODate, slot: Slot, days: number) {
  const ids = new Set<string>();
  for (let off = -days + 1; off <= days - 1; off++) {
    const d = addDays(date, off);
    for (const s of ["breakfast", "lunch", "dinner"] as Slot[]) {
      if (off === 0 && s === slot) continue;
      const m = meals[mealKey(d, s)];
      if (m && m.status !== "skipped") ids.add(m.dishId);
    }
  }
  return ids;
}

export function effortAllowed(dish: Dish, date: ISODate) {
  return dish.effort !== "long" || isWeekendDate(date);
}

export function suggestDishes(ctx: SuggestContext, date: ISODate, slot: Slot, limit = 5): Suggestion[] {
  const { dishes, ingredients, settings, meals } = ctx;
  const current = meals[mealKey(date, slot)]?.dishId;
  const recent = recentDishIds(meals, date, slot, settings.noRepeatDays);
  const k = dayInWeek(date);
  const neighbourDinnerCuisines = new Set(
    slot === "dinner"
      ? [addDays(date, -1), addDays(date, 1)]
          .map((d) => meals[mealKey(d, "dinner")])
          .filter((m) => m && m.status !== "skipped")
          .map((m) => dishes[m!.dishId]?.cuisine)
      : [],
  );

  // ingredients already needed by other meals this week
  const weekStock = new Set<string>();
  for (const d of weekDates(weekStartFor(date)))
    for (const s of ["breakfast", "lunch", "dinner"] as Slot[]) {
      if (d === date && s === slot) continue;
      const m = meals[mealKey(d, s)];
      if (!m || m.status === "skipped") continue;
      const dish = dishes[m.dishId];
      if (dish) perishablesOf(dish, ingredients).forEach((i) => weekStock.add(i.ingredientId));
    }

  const out: Suggestion[] = [];
  for (const dish of Object.values(dishes)) {
    if (dish.active === false || dish.id === current || !dish.slots.includes(slot)) continue;
    if (!effortAllowed(dish, date) || recent.has(dish.id)) continue;
    if (!shelfFeasible(dish, k, ingredients, settings.topupEnabled)) continue;
    if (neighbourDinnerCuisines.has(dish.cuisine)) continue;

    const per = perishablesOf(dish, ingredients);
    const newItems = per.filter((i) => !weekStock.has(i.ingredientId));
    let score = (dish.rating ?? 0) * 2;
    let reason: string;
    if (per.length === 0) {
      score += ctx.weekApproved ? 4 : 2;
      reason = "Only staples, nothing to buy";
    } else if (newItems.length === 0) {
      score += ctx.weekApproved ? 6 : 3;
      reason = `Reuses ${per.map((i) => ingredients[i.ingredientId].nameEn.toLowerCase()).slice(0, 2).join(", ")} already on the list`;
    } else {
      score -= ctx.weekApproved ? 2 * newItems.length : 0.5 * newItems.length;
      reason = `Needs ${newItems.map((i) => ingredients[i.ingredientId].nameEn.toLowerCase()).slice(0, 3).join(", ")}`;
      if (ctx.weekApproved) reason += " (top-up)";
    }
    if (needsTopup(dish, k, ingredients) && !reason.includes("top-up")) {
      score -= 1;
      reason += " · top-up day";
    }
    if (!isWeekendDate(date) && dish.effort === "quick" && slot === "dinner") score += 0.5;
    if (dish.lastCookedAt) score += Math.min(3, (Date.parse(date) - Date.parse(dish.lastCookedAt)) / 86400000 / 10);
    else score += 1;
    out.push({ dishId: dish.id, score, reason });
  }
  out.sort((a, b) => b.score - a.score || a.dishId.localeCompare(b.dishId));
  // variety: at most 2 suggestions from the same cuisine
  const picked: Suggestion[] = [];
  const perCuisine: Record<string, number> = {};
  for (const s of out) {
    const c = dishes[s.dishId].cuisine;
    if ((perCuisine[c] ?? 0) >= 2) continue;
    perCuisine[c] = (perCuisine[c] ?? 0) + 1;
    picked.push(s);
    if (picked.length === limit) break;
  }
  return picked;
}

export { isStaplesOnly };
