// Drafts a planning week (Sat..Fri) from the 4-week rotation.
import { daysBetween, weekDates, type ISODate } from "./dates";
import { suggestDishes, recentDishIds, type SuggestContext } from "./suggest";
import { SLOTS, mealKey, type Meal } from "./types";

/** Rotation is stored as [day 0..27][slot 0..2] -> dish id. */
export type Rotation = string[][];

export function rotationWeekFor(weekStart: ISODate, anchor: ISODate) {
  const weeks = Math.floor(daysBetween(anchor, weekStart) / 7);
  return ((weeks % 4) + 4) % 4; // 0..3
}

/** Ratings at or below this are swapped out when drafting. */
export const DISLIKED_AT = -2;

export function draftWeek(
  weekStart: ISODate,
  rotation: Rotation,
  ctx: Omit<SuggestContext, "weekApproved">,
): { meals: Meal[]; rotationWeek: number; replaced: { date: ISODate; slot: string; from: string; to: string }[] } {
  const rw = rotationWeekFor(weekStart, ctx.settings.rotationAnchor);
  const meals: Record<string, Meal> = { ...ctx.meals };
  const out: Meal[] = [];
  const replaced: { date: ISODate; slot: string; from: string; to: string }[] = [];

  weekDates(weekStart).forEach((date, i) => {
    SLOTS.forEach((slot, s) => {
      let dishId = rotation[rw * 7 + i][s];
      const dish = ctx.dishes[dishId];
      const recent = recentDishIds(meals, date, slot, ctx.settings.noRepeatDays);
      const bad =
        !dish || dish.active === false || (dish.rating ?? 0) <= DISLIKED_AT || recent.has(dishId);
      if (bad) {
        const alt = suggestDishes({ ...ctx, meals, weekApproved: false }, date, slot, 1)[0];
        if (alt) {
          replaced.push({ date, slot, from: dishId, to: alt.dishId });
          dishId = alt.dishId;
        }
      }
      const meal: Meal = {
        date, slot, dishId, servings: ctx.settings.servingsDefault, status: "planned", planB: false,
        originalDishId: null,
      };
      meals[mealKey(date, slot)] = meal;
      out.push(meal);
    });
  });
  return { meals: out, rotationWeek: rw + 1, replaced };
}
