// On-device database (IndexedDB via Dexie). Lives in the app's private storage on the
// phone: survives app and phone restarts, and APK updates signed with the same key.
import Dexie, { type Table } from "dexie";
import { todayIST, type ISODate } from "../lib/core/dates";
import type { Rotation } from "../lib/core/draft";
import { SEED_ROTATION } from "../lib/core/seedData";
import { DEFAULT_SETTINGS, type Dish, type Ingredient, type Meal, type MissingItem, type Settings, type StapleState, type Week } from "../lib/core/types";
import { DISHES } from "../lib/seed/dishes";
import { INGREDIENTS } from "../lib/seed/ingredients";

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
export const SEED_VERSION = 1;

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

/** First run: load the dish library, rotation and default settings. Idempotent. */
export async function seedIfNeeded() {
  const version = await getMeta<number>("seedVersion", 0);
  if (version >= SEED_VERSION) return false;
  await db.transaction("rw", [db.dishes, db.ingredients, db.meta, db.staples], async () => {
    const haveIng = new Set(await db.ingredients.toCollection().primaryKeys());
    await db.ingredients.bulkPut(INGREDIENTS.filter((i) => !haveIng.has(i.id)));
    const haveDish = new Set(await db.dishes.toCollection().primaryKeys());
    await db.dishes.bulkPut(
      DISHES.filter((d) => !haveDish.has(d.id)).map((d) => ({ ...d, active: true, rating: 0, lastCookedAt: null })),
    );
    if (!(await db.meta.get("rotation"))) await db.meta.put({ key: "rotation", value: SEED_ROTATION as Rotation });
    if (!(await db.meta.get("settings"))) await db.meta.put({ key: "settings", value: DEFAULT_SETTINGS satisfies Settings });
    if (version === 0) {
      // Assume the pantry is stocked today: dry staples start their restock cycle now.
      const today = todayIST();
      await db.staples.bulkPut(
        INGREDIENTS.filter((i) => i.category === "staple" && (i.restockDays ?? 0) > 7).map((i) => ({
          ingredientId: i.id, lastBought: today, lowReportedAt: null,
        })),
      );
    }
    await db.meta.put({ key: "seedVersion", value: SEED_VERSION });
  });
  return true;
}
