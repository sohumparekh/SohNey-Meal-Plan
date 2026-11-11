// Shelf-life rules, shared by the rotation generator, the weekly draft, suggestions
// and the shopping list.
//
// The weekly bag reaches home Friday evening, so on day k of the planning week
// (Sat = 1 ... Fri = 7) a fresh item from the weekly order is k days old.
// The optional Tuesday-evening top-up makes items k - 4 days old from Wednesday on.

import type { Dish, Ingredient } from "./types";

export const TOPUP_FIRST_DAY = 5; // Wednesday

export type Window = "main" | "topup";

export function windowForDay(ing: Ingredient, dayInWeek: number, topupEnabled = true): Window | null {
  if (dayInWeek <= ing.shelfLifeDays) return "main";
  if (topupEnabled && dayInWeek >= TOPUP_FIRST_DAY && dayInWeek - (TOPUP_FIRST_DAY - 1) <= ing.shelfLifeDays)
    return "topup";
  return null;
}

/** Non-optional, non-staple ingredients: the ones that can block a dish. */
export function perishablesOf(dish: Dish, ingredients: Record<string, Ingredient>) {
  return dish.ingredients.filter((i) => !i.optional && ingredients[i.ingredientId]?.category !== "staple");
}

export function isStaplesOnly(dish: Dish, ingredients: Record<string, Ingredient>) {
  return perishablesOf(dish, ingredients).length === 0;
}

export function shelfFeasible(
  dish: Dish,
  dayInWeek: number,
  ingredients: Record<string, Ingredient>,
  topupEnabled = true,
) {
  return perishablesOf(dish, ingredients).every(
    (i) => windowForDay(ingredients[i.ingredientId], dayInWeek, topupEnabled) !== null,
  );
}

export function needsTopup(dish: Dish, dayInWeek: number, ingredients: Record<string, Ingredient>) {
  return perishablesOf(dish, ingredients).some(
    (i) => windowForDay(ingredients[i.ingredientId], dayInWeek) === "topup",
  );
}
