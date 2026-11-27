import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { addDays, todayIST, weekStartFor } from "../lib/core/dates";
import { mealKey } from "../lib/core/types";
import { compareWithLocal, exportAll, importAll, parseHouseholdFile } from "./backup";
import { HouseDB, db, seedIfNeeded, useDatabase } from "./db";
import * as repo from "./repo";
import { DISHES } from "../lib/seed/dishes";
import { LEGACY_SEED_DISH_IDS } from "../lib/seed/legacyDishIds";

let n = 0;
const freshPhone = async () => {
  useDatabase(new HouseDB(`test-${++n}`));
  await seedIfNeeded();
};

describe("on-device data", () => {
  beforeEach(freshPhone);

  it("seeds the library once and keeps edits when the app starts again", async () => {
    expect(await db.dishes.count()).toBe(DISHES.length);
    await repo.setDishActive("pav_bhaji", false);
    expect(await seedIfNeeded()).toBe(false); // second start: nothing re-seeded
    expect((await db.dishes.get("pav_bhaji"))?.active).toBe(false);
  });

  it("data survives closing and reopening the database (app restart / APK update)", async () => {
    const name = db.name;
    const ws = weekStartFor(todayIST());
    await repo.ensureWeek(ws);
    await repo.swapMeal(ws, "dinner", "pav_bhaji");
    db.close();
    useDatabase(new HouseDB(name));
    await seedIfNeeded();
    expect((await db.meals.get([ws, "dinner"]))?.dishId).toBe("pav_bhaji");
  });

  it("creates the current week approved and next week as a draft", async () => {
    const ws = weekStartFor(todayIST());
    expect((await repo.ensureWeek(ws)).status).toBe("approved");
    expect(await db.meals.where("date").between(ws, addDays(ws, 6), true, true).count()).toBe(21);
    expect((await repo.ensureWeek(addDays(ws, 7))).status).toBe("draft");
    await repo.approveWeek(addDays(ws, 7));
    expect((await repo.getWeek(addDays(ws, 7)))?.status).toBe("approved");
  });

  it("swap, eating out and shopping ticks work offline", async () => {
    const ws = addDays(weekStartFor(todayIST()), 7);
    await repo.ensureWeek(ws);
    await repo.swapMeal(ws, "dinner", "palak_paneer");
    await repo.swapMeal(addDays(ws, 1), "lunch", "batata_shaak");
    const r = await repo.toggleEatingOut(ws, "dinner");
    expect(r.undone).toBe(false);
    expect((await db.meals.get([ws, "dinner"]))?.status).toBe("skipped");
    const { lists } = await repo.shoppingFor(ws);
    const palak = lists.grocer.find((i) => i.ingredientId === "palak");
    expect(palak).toBeDefined();
    await repo.setTick(ws, "grocer", "palak", true);
    expect((await repo.shoppingFor(ws)).lists.grocer.find((i) => i.ingredientId === "palak")?.ticked).toBe(true);
  });

  it("logging a sent message keeps a snapshot to detect later changes", async () => {
    const ws = weekStartFor(todayIST());
    await repo.ensureWeek(ws);
    const d = todayIST();
    await repo.logCookMessage({ direction: "out", kind: "daily", forDate: d, text: "x", withSnapshot: true });
    const before = (await repo.lastSentFor(["daily"], d))!.snapshot!;
    await repo.swapMeal(d, "dinner", "masala_khichdi");
    const now = repo.snapshotFor(await repo.getMealsMap(d, d), d);
    expect(now.dinner).not.toBe(before.dinner);
  });
});

describe("share plan / import between phones", () => {
  it("export on one phone and import on the other gives the same plan", async () => {
    await freshPhone();
    const ws = weekStartFor(todayIST());
    await repo.ensureWeek(ws);
    await repo.ensureWeek(addDays(ws, 7));
    await repo.swapMeal(addDays(ws, 8), "dinner", "misal_pav");
    await repo.saveSettings({ cookPhone: "9876543210", cookLanguage: "hindi" });
    const file = JSON.stringify(await exportAll());
    const mealsA = await db.meals.toArray();

    await freshPhone(); // the other phone
    const f = parseHouseholdFile(file);
    expect((await compareWithLocal(f)).fileIsNewer).toBe(true); // a fresh phone has no changes yet
    await importAll(f);
    const mealsB = await db.meals.toArray();
    const key = (m: { date: string; slot: string }) => mealKey(m.date, m.slot as never);
    expect(Object.fromEntries(mealsB.map((m) => [key(m), m.dishId]))).toEqual(Object.fromEntries(mealsA.map((m) => [key(m), m.dishId])));
    expect((await repo.getSettings()).cookPhone).toBe("9876543210");
    expect((await db.meals.get([addDays(ws, 8), "dinner"]))?.dishId).toBe("misal_pav");
  });

  it("newest wins: a file older than this phone's data is flagged", async () => {
    await freshPhone();
    await repo.ensureWeek(weekStartFor(todayIST()));
    const old = await exportAll();
    await new Promise((r) => setTimeout(r, 5));
    await repo.saveSettings({ cookName: "Vimal" });
    expect((await compareWithLocal(old)).fileIsNewer).toBe(false);
    const newer = { ...old, updatedAt: new Date(Date.now() + 60_000).toISOString() };
    expect((await compareWithLocal(newer)).fileIsNewer).toBe(true);
  });

  it("rejects files that are not ours", () => {
    expect(() => parseHouseholdFile("{}")).toThrow(/not a Ghar ka Menu file/);
    expect(() => parseHouseholdFile("hello")).toThrow(/not a Ghar ka Menu file/);
  });
});

describe("updating a phone from library v1 to v2", () => {
  it("keeps ratings, retires old dishes, keeps the started week, redrafts future drafts", async () => {
    useDatabase(new HouseDB(`test-${++n}`));
    const ws = weekStartFor(todayIST());
    // a phone on v1: old dish rated and active, an old dish in this week's plan, next week drafted
    await db.dishes.bulkPut([
      { id: "sev_tameta", nameEn: "Sev Tameta", nameCook: "Sev tamatar", slots: ["lunch"], cuisine: "Gujarati", effort: "quick", kind: "roti_sabzi", ingredients: [], planBId: "batata_shaak", active: true, rating: 2, lastCookedAt: null },
      { ...DISHES.find((d) => d.id === "kanda_poha")!, rating: 3, lastCookedAt: "2026-11-01", active: true },
      { id: "my_own_dish", nameEn: "Mine", nameCook: "Mine", slots: ["dinner"], cuisine: "Gujarati", effort: "quick", kind: "other", ingredients: [], planBId: "dal_khichdi", active: true, rating: 0, lastCookedAt: null },
    ]);
    await db.meta.bulkPut([{ key: "seedVersion", value: 1 }, { key: "settings", value: { cookName: "Vimal", cookPhone: "9000000000" } }]);
    await db.weeks.bulkPut([
      { weekStart: ws, rotationWeek: 1, status: "approved" },
      { weekStart: addDays(ws, 7), rotationWeek: 2, status: "draft" },
    ]);
    await db.meals.bulkPut([
      { date: ws, slot: "lunch", dishId: "sev_tameta", servings: 2, status: "planned", planB: false },
      { date: addDays(ws, 7), slot: "lunch", dishId: "sev_tameta", servings: 2, status: "planned", planB: false },
    ]);
    expect(LEGACY_SEED_DISH_IDS).toContain("sev_tameta");

    await seedIfNeeded();

    expect((await db.dishes.get("sev_tameta"))?.active).toBe(false);
    expect((await db.dishes.get("kanda_poha"))?.rating).toBe(3);
    expect((await db.dishes.get("kanda_poha"))?.lastCookedAt).toBe("2026-11-01");
    expect((await db.dishes.get("my_own_dish"))?.active).toBe(true);
    expect((await db.meals.get([ws, "lunch"]))?.dishId).toBe("sev_tameta"); // started week untouched
    expect(await db.weeks.get(addDays(ws, 7))).toBeUndefined(); // draft removed, redrafted on open
    expect((await repo.getSettings()).cookPhone).toBe("9000000000");
    expect((await repo.getSettings()).weeklyExtras.map((e) => e.ingredientId)).toContain("blueberries");
    expect((await db.ingredients.get("avocado"))?.source).toBe("grocer");
    expect((await db.ingredients.get("mushroom"))?.source).toBe("grocer");
  });
});
