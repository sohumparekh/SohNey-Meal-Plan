// Use cases: glue between the pure planner (core/*) and the database (db/repo).
import "server-only";
import { addDays, todayIST, weekStartFor, type ISODate } from "./core/dates";
import { draftWeek } from "./core/draft";
import { planEatingOut } from "./core/eatingOut";
import { buildShoppingLists } from "./core/shopping";
import { suggestDishes } from "./core/suggest";
import { mealKey, type Meal, type PlannerData, type Slot } from "./core/types";
import * as repo from "./db/repo";

export async function weekContext(weekStart: ISODate) {
  const data = await repo.getPlannerData();
  const meals = await repo.getMealsMap(addDays(weekStart, -data.settings.noRepeatDays), addDays(weekStart, 6 + data.settings.noRepeatDays));
  const week = await repo.getWeek(weekStart);
  return { data, meals, week };
}

/**
 * Makes sure a planning week exists. A week that has already started (or is the very
 * first one) is created approved, so the cook gets messages straight away.
 */
export async function ensureWeek(weekStart: ISODate, opts: { approve?: boolean } = {}) {
  const existing = await repo.getWeek(weekStart);
  if (existing) return { week: existing, created: false };
  const [data, rotation] = await Promise.all([repo.getPlannerData(), repo.getRotation()]);
  const meals = await repo.getMealsMap(addDays(weekStart, -data.settings.noRepeatDays), addDays(weekStart, -1));
  const draft = draftWeek(weekStart, rotation, { ...data, meals });
  const started = weekStart <= todayIST();
  await repo.createWeek(weekStart, draft.rotationWeek, draft.meals, opts.approve || started ? "approved" : "draft");
  return { week: (await repo.getWeek(weekStart))!, created: true };
}

export async function ensureCurrentWeeks() {
  const current = weekStartFor(todayIST());
  await ensureWeek(current, { approve: true });
  return current;
}

export async function shoppingFor(weekStart: ISODate) {
  const data = await repo.getPlannerData();
  const [meals, ticks, staples, missing, week] = await Promise.all([
    repo.getMeals(weekStart, addDays(weekStart, 6)),
    repo.getTicks(weekStart),
    repo.getStaples(),
    repo.getMissing(weekStart),
    repo.getWeek(weekStart),
  ]);
  const lists = buildShoppingLists({
    ...data, weekStart, meals, ticks, staples, missing, pickupDone: !!week?.pickupDoneAt,
  });
  return { data, lists, week };
}

export async function suggestionsFor(date: ISODate, slot: Slot) {
  const ws = weekStartFor(date);
  const { data, meals, week } = await weekContext(ws);
  return { data, suggestions: suggestDishes({ ...data, meals, weekApproved: week?.status === "approved" }, date, slot, 5) };
}

export async function swapMeal(date: ISODate, slot: Slot, dishId: string) {
  const ws = weekStartFor(date);
  await ensureWeek(ws);
  const { meals, data } = await weekContext(ws);
  const cur = meals[mealKey(date, slot)];
  const meal: Meal = {
    date, slot, dishId,
    servings: cur?.servings ?? data.settings.servingsDefault,
    status: cur?.status === "skipped" ? "swapped" : cur ? "swapped" : "planned",
    planB: false,
    originalDishId: cur?.originalDishId ?? cur?.dishId ?? null,
  };
  await repo.updateMeal(meal);
  return meal;
}

/** Toggle "eating out". Returns what happened so the UI can offer the cook message. */
export async function toggleEatingOut(date: ISODate, slot: Slot) {
  const ws = weekStartFor(date);
  const { data, meals } = await weekContext(ws);
  const meal = meals[mealKey(date, slot)];
  if (!meal) throw new Error("No meal planned");
  if (meal.status === "skipped") {
    await repo.updateMeal({ ...meal, status: meal.originalDishId ? "swapped" : "planned" });
    return { data, undone: true as const, meal };
  }
  const weekMeals = Object.values(meals).filter((m) => weekStartFor(m.date) === ws);
  const r = planEatingOut(data, weekMeals, date, slot);
  await repo.updateMeal(r.skipped);
  if (r.moved) await repo.updateMeal(r.moved.to);
  return { data, undone: false as const, meal: r.skipped, moved: r.moved, stranded: r.stranded };
}

/** Cook says an item ran out: affected meals today/tomorrow switch to Plan B, item goes on the top-up. */
export async function reportMissing(data: PlannerData, ingredientIds: string[], from: ISODate = todayIST()) {
  const meals = await repo.getMeals(from, addDays(from, 1));
  const switched: Meal[] = [];
  for (const id of ingredientIds) {
    await repo.addMissing(from, id);
    if (data.ingredients[id]?.category === "staple") await repo.reportStapleLow(id, true);
  }
  for (const m of meals) {
    if (m.status === "skipped" || m.planB) continue;
    const dish = data.dishes[m.dishId];
    if (dish?.ingredients.some((i) => !i.optional && ingredientIds.includes(i.ingredientId))) {
      const next = { ...m, planB: true };
      await repo.updateMeal(next);
      switched.push(next);
    }
  }
  return switched;
}

/** Snapshot of what the cook was told, used to detect later changes. */
export function snapshotFor(meals: Record<string, Meal>, date: ISODate) {
  const snap: Record<string, string> = {};
  for (const slot of ["breakfast", "lunch", "dinner"] as Slot[]) {
    const m = meals[mealKey(date, slot)];
    if (m) snap[slot] = m.status === "skipped" ? "skipped" : `${m.dishId}${m.planB ? ":planB" : ""}`;
  }
  return snap;
}
