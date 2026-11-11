// Shopping lists for one planning week.
//
//   grocer  : Shubham Vegetable. Fresh items for the week + weekly kitchen basics.
//   blinkit : Blinkit weekly order. Dairy, bread, specialty items for the week.
//   topup   : optional Tuesday top-up. Fragile items needed Wed-Fri, items that were
//             not received at pickup, and anything the cook reported missing.
//   staples : dry staples due on their restock cycle or reported "running low".
//
// Every ingredient appears in exactly one list (per delivery window). Staples are never
// computed from recipes.

import { addDays, dayInWeek, prettyDate, weekDates, type ISODate } from "./dates";
import { packLabel, packsFor } from "./quantity";
import { windowForDay, type Window } from "./shelf";
import type { Ingredient, ListName, Meal, MissingItem, PlannerData, StapleState } from "./types";

export interface ShoppingItem {
  list: ListName;
  ingredientId: string;
  nameEn: string;
  nameCook: string;
  qtyLabel: string;
  packs: number;
  /** Which meals need it, e.g. "Sat dinner: Pav Bhaji". */
  usedFor: string[];
  note?: string;
  ticked: boolean;
  source: Ingredient["source"];
}

export interface ShoppingInput extends PlannerData {
  weekStart: ISODate;
  meals: Meal[]; // the week's meals
  ticks: Set<string>; // `${list}:${ingredientId}`
  staples: Record<string, StapleState>;
  missing: MissingItem[]; // unresolved, reported by the cook
  pickupDone: boolean;
}

export interface ShoppingLists {
  grocer: ShoppingItem[];
  blinkit: ShoppingItem[];
  topup: ShoppingItem[];
  staples: ShoppingItem[];
  /** Meals whose fresh ingredients were not received or are missing. */
  atRisk: { date: ISODate; slot: string; dishId: string; ingredientIds: string[] }[];
}

const SLOT_SHORT: Record<string, string> = { breakfast: "breakfast", lunch: "lunch", dinner: "dinner" };

/** Items with a restock cycle of 1 day (milk, curd set at home) are never put on a list. */
const isDaily = (i: Ingredient) => (i.restockDays ?? 99) <= 1;

export function mainListFor(ing: Ingredient, eitherGoesTo: "blinkit" | "grocer"): "grocer" | "blinkit" {
  if (ing.source === "either") return eitherGoesTo;
  return ing.source;
}

export function stapleDue(ing: Ingredient, state: StapleState | undefined, weekStart: ISODate) {
  if (!ing.restockDays || isDaily(ing)) return false;
  if (state?.lowReportedAt) return true;
  if (!state?.lastBought) return ing.restockDays <= 7; // weekly basics always; others assumed stocked
  return addDays(state.lastBought, ing.restockDays) <= addDays(weekStart, 6);
}

export function buildShoppingLists(input: ShoppingInput): ShoppingLists {
  const { dishes, ingredients, settings, weekStart } = input;
  type Acc = { need: number; optional: number; usedFor: string[] };
  const acc: Record<string, Acc> = {}; // key `${window}:${id}`

  const dates = new Set(weekDates(weekStart));
  for (const meal of input.meals) {
    if (!dates.has(meal.date) || meal.status === "skipped") continue;
    const dish = dishes[meal.dishId];
    if (!dish) continue;
    const factor = meal.servings / 2;
    const k = dayInWeek(meal.date);
    for (const di of dish.ingredients) {
      const ing = ingredients[di.ingredientId];
      if (!ing || ing.category === "staple") continue;
      let win: Window | null = windowForDay(ing, k, settings.topupEnabled);
      if (!win) {
        if (di.optional) continue;
        win = "topup"; // a manual swap put a fragile item late in the week: buy it fresh
      }
      const a = (acc[`${win}:${ing.id}`] ??= { need: 0, optional: 0, usedFor: [] });
      if (di.optional) a.optional += di.qty * factor;
      else a.need += di.qty * factor;
      const label = `${prettyDate(meal.date).split(" ")[0]} ${SLOT_SHORT[meal.slot]}: ${dish.nameEn}`;
      if (!a.usedFor.includes(label)) a.usedFor.push(label);
    }
  }

  const lists: ShoppingLists = { grocer: [], blinkit: [], topup: [], staples: [], atRisk: [] };
  const item = (list: ListName, ing: Ingredient, packs: number, usedFor: string[], note?: string): ShoppingItem => ({
    list,
    ingredientId: ing.id,
    nameEn: ing.nameEn,
    nameCook: ing.nameCook,
    qtyLabel: ing.category === "staple" && ing.restockQty ? ing.restockQty : packLabel(ing, packs),
    packs,
    usedFor,
    note,
    ticked: input.ticks.has(`${list}:${ing.id}`),
    source: ing.source,
  });

  for (const [key, a] of Object.entries(acc)) {
    const [win, id] = key.split(":");
    const ing = ingredients[id];
    let packs = packsFor(ing, a.need);
    // garnish-only use: buy one pack with the weekly order if it is worth at least half
    // a pack; never make a top-up trip just for garnish
    if (packs === 0 && win === "main" && a.optional >= ing.pack * 0.5) packs = 1;
    if (packs === 0) continue;
    if (win === "main") {
      const list = mainListFor(ing, settings.eitherGoesTo);
      lists[list].push(item(list, ing, packs, a.usedFor));
    } else {
      lists.topup.push(item("topup", ing, packs, a.usedFor, "Needed Wed-Fri, buy Tuesday"));
    }
  }

  // staples
  for (const ing of Object.values(ingredients)) {
    if (ing.category !== "staple" || !stapleDue(ing, input.staples[ing.id], weekStart)) continue;
    const low = !!input.staples[ing.id]?.lowReportedAt;
    const note = low ? "Reported running low" : ing.restockDays === 7 ? "Weekly basics" : `Every ${ing.restockDays} days`;
    if (mainListFor(ing, settings.eitherGoesTo) === "grocer") lists.grocer.push(item("grocer", ing, 1, [], note));
    else lists.staples.push(item("staples", ing, 1, [], note));
  }

  // not received at pickup -> top-up, and flag the meals at risk
  const notReceived = new Set<string>();
  if (input.pickupDone)
    for (const it of [...lists.grocer, ...lists.blinkit])
      if (!it.ticked && ingredients[it.ingredientId].category !== "staple") notReceived.add(it.ingredientId);
  const missing = new Set(input.missing.filter((m) => !m.resolved).map((m) => m.ingredientId));

  for (const id of new Set([...notReceived, ...missing])) {
    const ing = ingredients[id];
    if (!ing || lists.topup.some((t) => t.ingredientId === id)) continue;
    const from = [...lists.grocer, ...lists.blinkit].find((x) => x.ingredientId === id);
    const note = missing.has(id) ? "Cook says it ran out" : "Not received at pickup";
    lists.topup.push(item("topup", ing, from?.packs ?? 1, from?.usedFor ?? [], note));
  }

  const problem = new Set([...notReceived, ...missing]);
  if (problem.size)
    for (const meal of input.meals) {
      if (meal.status === "skipped" || meal.planB) continue;
      const dish = dishes[meal.dishId];
      const hit = dish?.ingredients.filter((i) => !i.optional && problem.has(i.ingredientId)).map((i) => i.ingredientId);
      if (hit?.length) lists.atRisk.push({ date: meal.date, slot: meal.slot, dishId: meal.dishId, ingredientIds: hit });
    }

  const byName = (a: ShoppingItem, b: ShoppingItem) => a.nameEn.localeCompare(b.nameEn);
  for (const k of ["grocer", "blinkit", "topup", "staples"] as const) lists[k].sort(byName);
  return lists;
}

/** Plain-text order for the office grocer (read out on a call, or shown at the counter). */
export function grocerOrderText(items: ShoppingItem[], settings: { grocerName: string; householdName: string }) {
  const fresh = items.filter((i) => i.usedFor.length);
  const basics = items.filter((i) => !i.usedFor.length);
  const line = (i: ShoppingItem) => `- ${i.nameCook.split(" / ")[0]} (${i.nameEn}): ${i.qtyLabel}`;
  return [
    `${settings.grocerName}: order for ${settings.householdName}`,
    "",
    "Sabzi:",
    ...fresh.map(line),
    ...(basics.length ? ["", "Roz ka saamaan:", ...basics.map(line)] : []),
  ].join("\n");
}

/** Blinkit web search link. Format could not be verified from the build machine. */
export function blinkitSearchUrl(name: string) {
  return `https://blinkit.com/s/?q=${encodeURIComponent(name)}`;
}
