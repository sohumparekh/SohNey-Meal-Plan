import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { addDays, todayIST, weekStartFor } from "../lib/core/dates";
import { mealKey } from "../lib/core/types";
import { compareWithLocal, exportAll, importAll, parseHouseholdFile } from "./backup";
import { HouseDB, db, seedIfNeeded, useDatabase } from "./db";
import * as repo from "./repo";

let n = 0;
const freshPhone = async () => {
  useDatabase(new HouseDB(`test-${++n}`));
  await seedIfNeeded();
};

describe("on-device data", () => {
  beforeEach(freshPhone);

  it("seeds the library once and keeps edits when the app starts again", async () => {
    expect(await db.dishes.count()).toBe(105);
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
