// Data access. Server-only.
import "server-only";
import { addDays, type ISODate } from "../core/dates";
import type { Rotation } from "../core/draft";
import {
  DEFAULT_SETTINGS, mealKey, type Dish, type Ingredient, type Meal, type MissingItem, type PlannerData,
  type Settings, type Slot, type StapleState, type Week,
} from "../core/types";
import { sql } from "./client";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const toIngredient = (r: Row): Ingredient => ({
  id: r.id, nameEn: r.name_en, nameCook: r.name_cook, category: r.category, source: r.source, unit: r.unit,
  pack: Number(r.pack), packLabel: r.pack_label, shelfLifeDays: r.shelf_life_days,
  restockDays: r.restock_days ?? undefined, restockQty: r.restock_qty ?? undefined,
});

const toDish = (r: Row): Dish => ({
  id: r.id, nameEn: r.name_en, nameCook: r.name_cook, slots: r.slots, cuisine: r.cuisine, effort: r.effort,
  kind: r.kind, ingredients: r.ingredients, prepAhead: r.prep_ahead ?? undefined, planBId: r.plan_b_id,
  recipeCook: r.recipe_cook ?? undefined, rating: r.rating, lastCookedAt: r.last_cooked_at, active: r.active,
});

const toMeal = (r: Row): Meal => ({
  date: r.date, slot: r.slot, dishId: r.dish_id, servings: r.servings, status: r.status, planB: r.plan_b,
  originalDishId: r.original_dish_id, updatedAt: r.updated_at?.toISOString?.() ?? r.updated_at,
});

const toWeek = (r: Row): Week => ({
  weekStart: r.week_start, rotationWeek: r.rotation_week, status: r.status,
  approvedAt: r.approved_at?.toISOString?.() ?? null, pickupDoneAt: r.pickup_done_at?.toISOString?.() ?? null,
});

// ---------------------------------------------------------------- settings & library

export async function getSettings(): Promise<Settings> {
  const [row] = await sql()`select data from settings where id = 1`;
  return { ...DEFAULT_SETTINGS, ...(row?.data ?? {}), mealHours: { ...DEFAULT_SETTINGS.mealHours, ...(row?.data?.mealHours ?? {}) } };
}

export async function saveSettings(patch: Partial<Settings>) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await sql()`insert into settings (id, data) values (1, ${sql().json(next as never)})
    on conflict (id) do update set data = excluded.data`;
  return next;
}

export async function getPlannerData(): Promise<PlannerData> {
  const [dishes, ingredients, settings] = await Promise.all([
    sql()`select * from dishes`,
    sql()`select * from ingredients`,
    getSettings(),
  ]);
  return {
    dishes: Object.fromEntries(dishes.map((r) => [r.id, toDish(r)])),
    ingredients: Object.fromEntries(ingredients.map((r) => [r.id, toIngredient(r)])),
    settings,
  };
}

export async function getRotation(): Promise<Rotation> {
  const rows = await sql()`select * from rotation order by week_no, day_idx`;
  const rot: Rotation = Array.from({ length: 28 }, () => ["", "", ""]);
  const slots: Slot[] = ["breakfast", "lunch", "dinner"];
  for (const r of rows) rot[(r.week_no - 1) * 7 + r.day_idx][slots.indexOf(r.slot)] = r.dish_id;
  return rot;
}

export async function upsertDish(d: Dish & { sourceUrl?: string | null }) {
  await sql()`insert into dishes (id, name_en, name_cook, slots, cuisine, effort, kind, ingredients, prep_ahead,
      plan_b_id, recipe_cook, active, source_url)
    values (${d.id}, ${d.nameEn}, ${d.nameCook}, ${d.slots}, ${d.cuisine}, ${d.effort}, ${d.kind},
      ${sql().json(d.ingredients as never)}, ${d.prepAhead ? sql().json(d.prepAhead as never) : null}, ${d.planBId},
      ${d.recipeCook ?? null}, ${d.active ?? true}, ${d.sourceUrl ?? null})
    on conflict (id) do update set name_en = excluded.name_en, name_cook = excluded.name_cook, slots = excluded.slots,
      cuisine = excluded.cuisine, effort = excluded.effort, kind = excluded.kind, ingredients = excluded.ingredients,
      prep_ahead = excluded.prep_ahead, plan_b_id = excluded.plan_b_id, recipe_cook = excluded.recipe_cook,
      active = excluded.active`;
}

export async function upsertIngredient(i: Ingredient) {
  await sql()`insert into ingredients (id, name_en, name_cook, category, source, unit, pack, pack_label,
      shelf_life_days, restock_days, restock_qty)
    values (${i.id}, ${i.nameEn}, ${i.nameCook}, ${i.category}, ${i.source}, ${i.unit}, ${i.pack}, ${i.packLabel},
      ${i.shelfLifeDays}, ${i.restockDays ?? null}, ${i.restockQty ?? null})
    on conflict (id) do nothing`;
}

export async function setDishActive(id: string, active: boolean) {
  await sql()`update dishes set active = ${active} where id = ${id}`;
}

export async function rateDish(id: string, delta: 1 | -1) {
  await sql()`update dishes set rating = greatest(-5, least(5, rating + ${delta})) where id = ${id}`;
}

export async function markCooked(date: ISODate) {
  await sql()`update dishes d set last_cooked_at = ${date}
    from meals m where m.date = ${date} and m.status <> 'skipped' and d.id = m.dish_id
      and (d.last_cooked_at is null or d.last_cooked_at < ${date})`;
}

// ---------------------------------------------------------------- weeks & meals

export async function getWeek(weekStart: ISODate): Promise<Week | null> {
  const [r] = await sql()`select * from weeks where week_start = ${weekStart}`;
  return r ? toWeek(r) : null;
}

export async function createWeek(weekStart: ISODate, rotationWeek: number, meals: Meal[], status: "draft" | "approved") {
  await sql().begin(async (tx) => {
    await tx`insert into weeks (week_start, rotation_week, status, approved_at)
      values (${weekStart}, ${rotationWeek}, ${status}, ${status === "approved" ? new Date() : null})
      on conflict (week_start) do nothing`;
    for (const m of meals)
      await tx`insert into meals (date, slot, dish_id, servings, status, plan_b)
        values (${m.date}, ${m.slot}, ${m.dishId}, ${m.servings}, ${m.status}, ${m.planB})
        on conflict (date, slot) do nothing`;
  });
}

export async function setWeekStatus(weekStart: ISODate, status: "draft" | "approved") {
  await sql()`update weeks set status = ${status}, approved_at = ${status === "approved" ? new Date() : null}
    where week_start = ${weekStart}`;
}

export async function setPickupDone(weekStart: ISODate, done: boolean) {
  await sql()`update weeks set pickup_done_at = ${done ? new Date() : null} where week_start = ${weekStart}`;
}

export async function getMeals(from: ISODate, to: ISODate): Promise<Meal[]> {
  const rows = await sql()`select * from meals where date between ${from} and ${to} order by date`;
  return rows.map(toMeal);
}

export async function getMealsMap(from: ISODate, to: ISODate) {
  return Object.fromEntries((await getMeals(from, to)).map((m) => [mealKey(m.date, m.slot), m]));
}

export async function updateMeal(m: Meal) {
  await sql()`insert into meals (date, slot, dish_id, servings, status, plan_b, original_dish_id, updated_at)
    values (${m.date}, ${m.slot}, ${m.dishId}, ${m.servings}, ${m.status}, ${m.planB}, ${m.originalDishId ?? null}, now())
    on conflict (date, slot) do update set dish_id = excluded.dish_id, servings = excluded.servings,
      status = excluded.status, plan_b = excluded.plan_b, original_dish_id = excluded.original_dish_id, updated_at = now()`;
}

// ---------------------------------------------------------------- shopping

export async function getTicks(weekStart: ISODate) {
  const rows = await sql()`select list, ingredient_id from shopping_ticks where week_start = ${weekStart}`;
  return new Set(rows.map((r) => `${r.list}:${r.ingredient_id}`));
}

export async function setTick(weekStart: ISODate, list: string, ingredientId: string, ticked: boolean) {
  if (ticked)
    await sql()`insert into shopping_ticks (week_start, list, ingredient_id) values (${weekStart}, ${list}, ${ingredientId})
      on conflict do nothing`;
  else await sql()`delete from shopping_ticks where week_start = ${weekStart} and list = ${list} and ingredient_id = ${ingredientId}`;
}

export async function getStaples(): Promise<Record<string, StapleState>> {
  const rows = await sql()`select * from staples`;
  return Object.fromEntries(
    rows.map((r) => [r.ingredient_id, { ingredientId: r.ingredient_id, lastBought: r.last_bought, lowReportedAt: r.low_reported_at?.toISOString?.() ?? null }]),
  );
}

export async function markStapleBought(ingredientId: string, date: ISODate) {
  await sql()`insert into staples (ingredient_id, last_bought, low_reported_at) values (${ingredientId}, ${date}, null)
    on conflict (ingredient_id) do update set last_bought = excluded.last_bought, low_reported_at = null`;
}

export async function reportStapleLow(ingredientId: string, low: boolean) {
  await sql()`insert into staples (ingredient_id, low_reported_at) values (${ingredientId}, ${low ? new Date() : null})
    on conflict (ingredient_id) do update set low_reported_at = excluded.low_reported_at`;
}

export async function getMissing(from: ISODate): Promise<MissingItem[]> {
  const rows = await sql()`select * from missing_items where date >= ${from} and resolved = false`;
  return rows.map((r) => ({ id: r.id, date: r.date, ingredientId: r.ingredient_id, resolved: r.resolved }));
}

export async function addMissing(date: ISODate, ingredientId: string) {
  await sql()`insert into missing_items (date, ingredient_id) values (${date}, ${ingredientId})`;
}

export async function resolveMissing(ingredientId: string) {
  await sql()`update missing_items set resolved = true where ingredient_id = ${ingredientId} and resolved = false`;
}

// ---------------------------------------------------------------- messages, push, jobs

export async function logCookMessage(m: { direction: "out" | "in"; kind: string; forDate?: ISODate | null; text: string; snapshot?: unknown; parsedIntent?: unknown }) {
  await sql()`insert into cook_messages (direction, kind, for_date, text, snapshot, parsed_intent)
    values (${m.direction}, ${m.kind}, ${m.forDate ?? null}, ${m.text},
      ${m.snapshot ? sql().json(m.snapshot as never) : null}, ${m.parsedIntent ? sql().json(m.parsedIntent as never) : null})`;
}

export async function lastSentFor(kinds: string[], forDate: ISODate) {
  const [r] = await sql()`select * from cook_messages where direction = 'out' and kind = any(${kinds}) and for_date = ${forDate}
    order by created_at desc limit 1`;
  return r ? { text: r.text as string, snapshot: r.snapshot as Record<string, string> | null, createdAt: r.created_at as Date } : null;
}

export async function recentCookMessages(limit = 20) {
  const rows = await sql()`select * from cook_messages order by created_at desc limit ${limit}`;
  return rows.map((r) => ({ id: r.id as number, direction: r.direction as string, kind: r.kind as string, text: r.text as string, createdAt: (r.created_at as Date).toISOString() }));
}

export async function savePushSubscription(sub: { endpoint: string }) {
  await sql()`insert into push_subscriptions (endpoint, data) values (${sub.endpoint}, ${sql().json(sub as never)})
    on conflict (endpoint) do update set data = excluded.data`;
}

export async function getPushSubscriptions() {
  const rows = await sql()`select data from push_subscriptions`;
  return rows.map((r) => r.data);
}

export async function deletePushSubscription(endpoint: string) {
  await sql()`delete from push_subscriptions where endpoint = ${endpoint}`;
}

/** Returns true the first time a (job, key) pair is claimed. */
export async function claimJob(job: string, key: string) {
  const rows = await sql()`insert into job_runs (job, run_key) values (${job}, ${key}) on conflict do nothing returning job`;
  return rows.length > 0;
}

export async function pruneOld(today: ISODate) {
  await sql()`delete from job_runs where ran_at < now() - interval '60 days'`;
  await sql()`delete from cook_messages where created_at < now() - interval '180 days'`;
  await sql()`delete from shopping_ticks where week_start < ${addDays(today, -60)}`;
}
