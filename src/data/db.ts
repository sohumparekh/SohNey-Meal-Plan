// On-device database (IndexedDB via Dexie). Lives in the app's private storage on the
// phone: survives app and phone restarts, and APK updates signed with the same key.
import Dexie, { type Table } from "dexie";
import { addDays, todayIST, weekStartFor, type ISODate } from "../lib/core/dates";
import type { Rotation } from "../lib/core/draft";
import { SEED_ROTATION } from "../lib/core/seedData";
import { DEFAULT_SETTINGS, type Dish, type Ingredient, type Meal, type MissingItem, type Settings, type StapleState, type Week } from "../lib/core/types";
import { DISHES } from "../lib/seed/dishes";
import { INGREDIENTS } from "../lib/seed/ingredients";
import { LEGACY_SEED_DISH_IDS } from "../lib/seed/legacyDishIds";

export interface Tick { key: string; weekStart: ISODate; list: string; ingredientId: string; tickedAt: string }
export interface CookMessage {
  id?: number;
  direction: "out" | "in";
  kind: string;
  forDate: ISODate | null;
  text: string;
  snapshot?: Record<string, string> | null;
  createdAt: string;
}
export interface Meta { key: string; value: unknown }

export class HouseDB extends Dexie {
  dishes!: Table<Dish, string>;
  ingredients!: Table<Ingredient, string>;
  meals!: Table<Meal, [string, string]>;
  weeks!: Table<Week, string>;
  ticks!: Table<Tick, string>;
  staples!: Table<StapleState, string>;
  missing!: Table<MissingItem, number>;
  messages!: Table<CookMessage, number>;
  meta!: Table<Meta, string>;

  constructor(name = "ghar-ka-menu") {
    super(name);
    this.version(1).stores({
      dishes: "id",
      ingredients: "id",
      meals: "[date+slot], date",
      weeks: "weekStart",
      ticks: "key, weekStart",
      staples: "ingredientId",
      missing: "++id, date",
      messages: "++id, forDate, createdAt",
      meta: "key",
    });
  }
}

export const DATA_TABLES = ["dishes", "ingredients", "meals", "weeks", "ticks", "staples", "missing", "messages", "meta"] as const;

export let db = new HouseDB();
/** Tests use a fresh database per test. */
export function useDatabase(next: HouseDB) {
  db = next;
}

/** Bump when the seed library gains dishes/ingredients; only missing rows are added. */
export const SEED_VERSION = 2;

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.meta.get(key);
  return row ? (row.value as T) : fallback;
}
export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value });
}

/** Marks the household data as changed (used for "newest wins" on import). */
export async function touch() {
  await db.meta.put({ key: "updatedAt", value: new Date().toISOString() });
}

/**
 * First run: load the dish library, rotation and default settings.
 * Later library versions (v2 = Neyomi's list) update the phone's data in place:
 * seed dishes get their new recipe but keep rating and "last made"; old seed dishes
 * that are no longer in the library are switched off (history keeps working); dishes
 * added in the app are never touched. Idempotent.
 */
export async function seedIfNeeded() {
  const version = await getMeta<number>("seedVersion", 0);
  if (version >= SEED_VERSION) return false;
  const today = todayIST();
  await db.transaction("rw", [db.dishes, db.ingredients, db.meta, db.staples, db.weeks, db.meals], async () => {
    // ingredients: seed rows are reference data (sources, shelf life), so they are refreshed
    await db.ingredients.bulkPut(INGREDIENTS);

    const seedIds = new Set(DISHES.map((d) => d.id));
    for (const d of DISHES) {
      const cur = await db.dishes.get(d.id);
      await db.dishes.put({
        ...d,
        active: cur?.active ?? true,
        rating: cur?.rating ?? 0,
        lastCookedAt: cur?.lastCookedAt ?? null,
      });
    }
    if (version > 0) {
      for (const id of LEGACY_SEED_DISH_IDS) if (!seedIds.has(id)) await db.dishes.update(id, { active: false });
      // future draft weeks are re-drafted from the new rotation; started or approved weeks stay
      const thisWeek = weekStartFor(today);
      const drafts = await db.weeks.filter((w) => w.weekStart > thisWeek && w.status === "draft").toArray();
      for (const w of drafts) {
        await db.meals.where("date").between(w.weekStart, addDays(w.weekStart, 6), true, true).delete();
        await db.weeks.delete(w.weekStart);
      }
    }
    await db.meta.put({ key: "rotation", value: SEED_ROTATION as Rotation });
    if (!(await db.meta.get("settings"))) await db.meta.put({ key: "settings", value: DEFAULT_SETTINGS satisfies Settings });

    // Dry staples start their restock cycle today (assume the pantry is stocked).
    // Weekly basics (onion, potato...) get no row, so they are due every week.
    for (const i of INGREDIENTS)
      if (i.category === "staple" && (i.restockDays ?? 0) > 7 && !(await db.staples.get(i.id)))
        await db.staples.put({ ingredientId: i.id, lastBought: today, lowReportedAt: null });

    await db.meta.put({ key: "seedVersion", value: SEED_VERSION });
  });
  return true;
}
