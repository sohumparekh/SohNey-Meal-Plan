// Everything the screens read and write. Pure planner logic stays in lib/core.
import { addDays, nowIST, todayIST, weekStartFor, type ISODate } from "../lib/core/dates";
import { draftWeek, type Rotation } from "../lib/core/draft";
import { planEatingOut } from "../lib/core/eatingOut";
import { buildShoppingLists } from "../lib/core/shopping";
import { suggestDishes } from "../lib/core/suggest";
import {
  DEFAULT_SETTINGS, SLOTS, mealKey, type Dish, type Ingredient, type Meal, type PlannerData, type Settings, type Slot, type Week,
} from "../lib/core/types";
import { db, getMeta, setMeta, touch, type CookMessage } from "./db";

// ---------------------------------------------------------------- reads

export async function getSettings(): Promise<Settings> {
  const s = await getMeta<Partial<Settings>>("settings", {});
  return { ...DEFAULT_SETTINGS, ...s, mealHours: { ...DEFAULT_SETTINGS.mealHours, ...(s.mealHours ?? {}) } };
}

export async function getPlannerData(): Promise<PlannerData> {
  const [dishes, ingredients, settings] = await Promise.all([db.dishes.toArray(), db.ingredients.toArray(), getSettings()]);
  return {
    dishes: Object.fromEntries(dishes.map((d) => [d.id, d])),
    ingredients: Object.fromEntries(ingredients.map((i) => [i.id, i])),
    settings,
  };
}

export const getRotation = () => getMeta<Rotation>("rotation", []);
export const getWeek = (weekStart: ISODate) => db.weeks.get(weekStart);

export async function getMeals(from: ISODate, to: ISODate): Promise<Meal[]> {
  return db.meals.where("date").between(from, to, true, true).toArray();
}
export async function getMealsMap(from: ISODate, to: ISODate) {
  return Object.fromEntries((await getMeals(from, to)).map((m) => [mealKey(m.date, m.slot), m]));
}

export async function weekContext(weekStart: ISODate) {
  const data = await getPlannerData();
  const n = data.settings.noRepeatDays;
  const meals = await getMealsMap(addDays(weekStart, -n), addDays(weekStart, 6 + n));
  const week = await getWeek(weekStart);
  return { data, meals, week };
}

export async function shoppingFor(weekStart: ISODate) {
  const data = await getPlannerData();
  const [meals, ticks, staples, missing, week] = await Promise.all([
    getMeals(weekStart, addDays(weekStart, 6)),
    db.ticks.where("weekStart").equals(weekStart).toArray(),
    db.staples.toArray(),
    db.missing.where("date").aboveOrEqual(weekStart).filter((m) => !m.resolved).toArray(),
    getWeek(weekStart),
  ]);
  const lists = buildShoppingLists({
    ...data, weekStart, meals,
    ticks: new Set(ticks.map((t) => `${t.list}:${t.ingredientId}`)),
    staples: Object.fromEntries(staples.map((s) => [s.ingredientId, s])),
    missing,
    pickupDone: !!week?.pickupDoneAt,
  });
  return { data, lists, week, staples };
}

/** On Thu/Fri, once next week is approved, shopping is for next week. */
export async function shoppingWeekDefault(): Promise<ISODate> {
  const today = todayIST();
  const thisWs = weekStartFor(today);
  const next = await getWeek(addDays(thisWs, 7));
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  return next?.status === "approved" && (dow === 4 || dow === 5) ? addDays(thisWs, 7) : thisWs;
}

export async function suggestionsFor(date: ISODate, slot: Slot) {
  const { data, meals, week } = await weekContext(weekStartFor(date));
  return suggestDishes({ ...data, meals, weekApproved: week?.status === "approved" }, date, slot, 5).map((s) => {
    const d = data.dishes[s.dishId];
    return { id: d.id, nameEn: d.nameEn, nameCook: d.nameCook, cuisine: d.cuisine, effort: d.effort, reason: s.reason };
  });
}

export async function lastSentFor(kinds: string[], forDate: ISODate): Promise<CookMessage | undefined> {
  const rows = await db.messages.where("forDate").equals(forDate).filter((m) => m.direction === "out" && kinds.includes(m.kind)).toArray();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export async function recentMessages(limit = 15) {
  return db.messages.orderBy("createdAt").reverse().limit(limit).toArray();
}

/** What the cook was told, to detect later changes. */
export function snapshotFor(meals: Record<string, Meal>, date: ISODate) {
  const snap: Record<string, string> = {};
  for (const slot of SLOTS) {
    const m = meals[mealKey(date, slot)];
    if (m) snap[slot] = m.status === "skipped" ? "skipped" : `${m.dishId}${m.planB ? ":planB" : ""}`;
  }
  return snap;
}

// ---------------------------------------------------------------- weeks

/**
 * Makes sure a planning week exists. A week that has already started is created
 * approved so the cook's messages work straight away; future weeks start as drafts.
 */
export async function ensureWeek(weekStart: ISODate, opts: { approve?: boolean } = {}): Promise<Week> {
  const existing = await getWeek(weekStart);
  if (existing) return existing;
  const [data, rotation] = await Promise.all([getPlannerData(), getRotation()]);
  const meals = await getMealsMap(addDays(weekStart, -data.settings.noRepeatDays), addDays(weekStart, -1));
  const draft = draftWeek(weekStart, rotation, { ...data, meals });
  const approved = opts.approve || weekStart <= todayIST();
  const week: Week = {
    weekStart, rotationWeek: draft.rotationWeek, status: approved ? "approved" : "draft",
    approvedAt: approved ? new Date().toISOString() : null, pickupDoneAt: null,
  };
  await db.transaction("rw", db.weeks, db.meals, db.meta, async () => {
    if (await db.weeks.get(weekStart)) return; // created meanwhile
    await db.weeks.put(week);
    for (const m of draft.meals) if (!(await db.meals.get([m.date, m.slot]))) await db.meals.put(m);
    await touch();
  });
  return (await getWeek(weekStart))!;
}

/** Called on app start/resume: this week, tomorrow's week, and (from Thursday) next week's draft. */
export async function ensureCurrentWeeks() {
  const now = nowIST();
  const ws = weekStartFor(now.date);
  await ensureWeek(ws, { approve: true });
  await ensureWeek(weekStartFor(addDays(now.date, 1)), { approve: true });
  const dow = new Date(`${now.date}T00:00:00Z`).getUTCDay();
  if (dow === 4 || dow === 5) await ensureWeek(addDays(ws, 7));
  await markCookedUpTo(addDays(now.date, -1));
}

async function markCookedUpTo(lastDay: ISODate) {
  const from = await getMeta<ISODate>("cookedMarkedThrough", addDays(lastDay, -1));
  if (from >= lastDay) return;
  const meals = await getMeals(addDays(from, 1), lastDay);
  await db.transaction("rw", db.dishes, db.meta, async () => {
    for (const m of meals) {
      if (m.status === "skipped") continue;
      const d = await db.dishes.get(m.dishId);
      if (d && (!d.lastCookedAt || d.lastCookedAt < m.date)) await db.dishes.update(d.id, { lastCookedAt: m.date });
    }
    await setMeta("cookedMarkedThrough", lastDay);
  });
}

export async function approveWeek(weekStart: ISODate) {
  await ensureWeek(weekStart);
  await db.weeks.update(weekStart, { status: "approved", approvedAt: new Date().toISOString() });
  await touch();
}

/** Throw away a future draft and draft it again from the rotation. */
export async function redraftWeek(weekStart: ISODate) {
  if (weekStart <= todayIST()) throw new Error("This week has started");
  await db.transaction("rw", db.weeks, db.meals, async () => {
    await db.meals.where("date").between(weekStart, addDays(weekStart, 6), true, true).delete();
    await db.weeks.delete(weekStart);
  });
  await ensureWeek(weekStart);
}

export async function setPickupDone(weekStart: ISODate, done: boolean) {
  await db.weeks.update(weekStart, { pickupDoneAt: done ? new Date().toISOString() : null });
  await touch();
}

// ---------------------------------------------------------------- meals

export async function updateMeal(m: Meal) {
  await db.meals.put({ ...m, updatedAt: new Date().toISOString() });
  await touch();
}

async function mealAt(date: ISODate, slot: Slot) {
  return db.meals.get([date, slot]);
}

export async function swapMeal(date: ISODate, slot: Slot, dishId: string) {
  await ensureWeek(weekStartFor(date));
  const cur = await mealAt(date, slot);
  const s = await getSettings();
  await updateMeal({
    date, slot, dishId, servings: cur?.servings ?? s.servingsDefault,
    status: cur ? "swapped" : "planned", planB: false,
    originalDishId: cur?.originalDishId ?? cur?.dishId ?? null,
  });
}

export async function setServings(date: ISODate, slot: Slot, servings: number) {
  const m = await mealAt(date, slot);
  if (m) await updateMeal({ ...m, servings: Math.max(1, Math.min(12, servings)) });
}

export async function setPlanB(date: ISODate, slot: Slot, on: boolean) {
  const m = await mealAt(date, slot);
  if (m) await updateMeal({ ...m, planB: on });
}

/** Toggle "eating out"; moves the dish's fresh items to a later meal when possible. */
export async function toggleEatingOut(date: ISODate, slot: Slot) {
  const ws = weekStartFor(date);
  const { data, meals } = await weekContext(ws);
  const meal = meals[mealKey(date, slot)];
  if (!meal) throw new Error("No meal planned");
  if (meal.status === "skipped") {
    await updateMeal({ ...meal, status: meal.originalDishId ? "swapped" : "planned" });
    return { data, undone: true as const, meal };
  }
  const weekMeals = Object.values(meals).filter((m) => weekStartFor(m.date) === ws);
  const r = planEatingOut(data, weekMeals, date, slot);
  await updateMeal(r.skipped);
  if (r.moved) await updateMeal(r.moved.to);
  return { data, undone: false as const, meal: r.skipped, moved: r.moved, stranded: r.stranded };
}

/** The cook says an item ran out: meals today/tomorrow that need it switch to Plan B. */
export async function reportMissing(data: PlannerData, ingredientIds: string[], from: ISODate = todayIST()) {
  const meals = await getMeals(from, addDays(from, 1));
  const switched: Meal[] = [];
  for (const id of ingredientIds) {
    await db.missing.add({ date: from, ingredientId: id, resolved: false } as never);
    if (data.ingredients[id]?.category === "staple") await reportStapleLow(id, true);
  }
  for (const m of meals) {
    if (m.status === "skipped" || m.planB) continue;
    if (data.dishes[m.dishId]?.ingredients.some((i) => !i.optional && ingredientIds.includes(i.ingredientId))) {
      const next = { ...m, planB: true };
      await updateMeal(next);
      switched.push(next);
    }
  }
  await touch();
  return switched;
}

// ---------------------------------------------------------------- shopping

export async function setTick(weekStart: ISODate, list: string, ingredientId: string, ticked: boolean) {
  const key = `${list}:${ingredientId}`;
  // the tick key must be unique per week
  const id = `${weekStart}|${key}`;
  if (ticked) {
    await db.ticks.put({ key: id, weekStart, list, ingredientId, tickedAt: new Date().toISOString() });
    const ing = await db.ingredients.get(ingredientId);
    if (ing?.category === "staple") await markStapleBought(ingredientId, todayIST());
    if (list === "topup") await db.missing.filter((m) => m.ingredientId === ingredientId && !m.resolved).modify({ resolved: true });
  } else {
    await db.ticks.delete(id);
  }
  await touch();
}

export async function markStapleBought(ingredientId: string, date: ISODate) {
  await db.staples.put({ ingredientId, lastBought: date, lowReportedAt: null });
  await touch();
}

export async function reportStapleLow(ingredientId: string, low: boolean) {
  const cur = await db.staples.get(ingredientId);
  await db.staples.put({ ingredientId, lastBought: cur?.lastBought ?? null, lowReportedAt: low ? new Date().toISOString() : null });
  await touch();
}

// ---------------------------------------------------------------- messages, dishes, settings

export async function logCookMessage(m: { direction: "out" | "in"; kind: string; forDate: ISODate | null; text: string; withSnapshot?: boolean }) {
  let snapshot: Record<string, string> | null = null;
  if (m.withSnapshot && m.forDate) snapshot = snapshotFor(await getMealsMap(m.forDate, m.forDate), m.forDate);
  await db.messages.add({ direction: m.direction, kind: m.kind, forDate: m.forDate, text: m.text, snapshot, createdAt: new Date().toISOString() });
  await touch();
}

export async function saveSettings(patch: Partial<Settings>) {
  const next = { ...(await getSettings()), ...patch };
  await setMeta("settings", next);
  await touch();
  return next;
}

export async function saveDish(dish: Dish, newIngredients: Ingredient[]) {
  await db.transaction("rw", db.dishes, db.ingredients, async () => {
    for (const i of newIngredients) if (!(await db.ingredients.get(i.id))) await db.ingredients.put(i);
    await db.dishes.put({ rating: 0, lastCookedAt: null, active: true, ...dish });
  });
  await touch();
}

export async function setDishActive(id: string, active: boolean) {
  await db.dishes.update(id, { active });
  await touch();
}

export async function rateDish(id: string, delta: 1 | -1) {
  const d = await db.dishes.get(id);
  if (d) await db.dishes.update(id, { rating: Math.max(-5, Math.min(5, (d.rating ?? 0) + delta)) });
  await touch();
}
