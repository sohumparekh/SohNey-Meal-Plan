import { describe, expect, it } from "vitest";
import { addDays, dayInWeek, weekDates, weekStartFor } from "./dates";
import { draftWeek, rotationWeekFor } from "./draft";
import { planEatingOut } from "./eatingOut";
import { dailyMessage, parseCookReply, prepTasksForEvening, waLink, weekOverviewMessage } from "./cookMessages";
import { packLabel, packsFor } from "./quantity";
import { SEED_ROTATION, seedPlannerData } from "./seedData";
import { perishablesOf, windowForDay } from "./shelf";
import { buildShoppingLists, stapleDue } from "./shopping";
import { suggestDishes } from "./suggest";
import { SLOTS, mealKey, type Meal } from "./types";

const data = seedPlannerData();
const ANCHOR = "2026-11-14"; // a Saturday
const byKey = (meals: Meal[]) => Object.fromEntries(meals.map((m) => [mealKey(m.date, m.slot), m]));
const meal = (date: string, slot: Meal["slot"], dishId: string, extra: Partial<Meal> = {}): Meal => ({
  date, slot, dishId, servings: 2, status: "planned", planB: false, ...extra,
});
const draft = (weekStart = ANCHOR, prior: Meal[] = []) =>
  draftWeek(weekStart, SEED_ROTATION, { ...data, meals: byKey(prior) }).meals;

describe("dates", () => {
  it("weeks run Saturday to Friday", () => {
    expect(weekStartFor("2026-11-14")).toBe("2026-11-14"); // Sat
    expect(weekStartFor("2026-11-20")).toBe("2026-11-14"); // Fri
    expect(weekStartFor("2026-11-21")).toBe("2026-11-21"); // next Sat
    expect(dayInWeek("2026-11-14")).toBe(1);
    expect(dayInWeek("2026-11-20")).toBe(7);
  });
  it("rotation week cycles 0..3 from the anchor, also backwards", () => {
    expect(rotationWeekFor("2026-11-14", ANCHOR)).toBe(0);
    expect(rotationWeekFor("2026-12-05", ANCHOR)).toBe(3);
    expect(rotationWeekFor("2026-12-12", ANCHOR)).toBe(0);
    expect(rotationWeekFor("2026-11-07", ANCHOR)).toBe(3);
  });
});

describe("rounding to purchase units", () => {
  const ing = data.ingredients;
  it("rounds up to whole packs", () => {
    expect(packsFor(ing.paneer, 200)).toBe(1);
    expect(packsFor(ing.paneer, 201)).toBe(2);
    expect(packsFor(ing.coriander, 0.25)).toBe(1);
    expect(packsFor(ing.coriander, 0)).toBe(0);
  });
  it("labels packs in shop units", () => {
    expect(packLabel(ing.bhindi, 2)).toBe("500 g");
    expect(packLabel(ing.bhindi, 4)).toBe("1 kg");
    expect(packLabel(ing.palak, 3)).toBe("3 bunches");
    expect(packLabel(ing.capsicum, 2)).toBe("2 pc");
    expect(packLabel(ing.pav, 2)).toBe("2 × 1 packet (6 pav)");
  });
});

describe("seed library", () => {
  it("every Plan B uses only staples, needs no prep and shares a slot", () => {
    for (const d of Object.values(data.dishes)) {
      const pb = data.dishes[d.planBId];
      expect(pb, d.id).toBeDefined();
      expect(perishablesOf(pb, data.ingredients), `${d.id} -> ${pb.id}`).toHaveLength(0);
      expect(pb.prepAhead, pb.id).toBeUndefined();
      expect(d.slots.some((s) => pb.slots.includes(s)), d.id).toBe(true);
    }
  });
});

describe("4-week rotation", () => {
  const days = SEED_ROTATION.length;
  it("has 28 days x 3 meals", () => {
    expect(days).toBe(28);
    SEED_ROTATION.forEach((row) => expect(row).toHaveLength(3));
  });
  it("never repeats a dish within 10 days (including across the cycle wrap)", () => {
    const seen: Record<string, number[]> = {};
    SEED_ROTATION.forEach((row, day) => row.forEach((id) => (seen[id] ??= []).push(day)));
    for (const [id, ds] of Object.entries(seen))
      for (let i = 0; i < ds.length; i++)
        for (let j = i + 1; j < ds.length; j++) {
          const dist = Math.min(ds[j] - ds[i], days - (ds[j] - ds[i]));
          expect(dist, id).toBeGreaterThanOrEqual(10);
        }
  });
  it("never uses a fresh ingredient past its shelf life", () => {
    SEED_ROTATION.forEach((row, day) =>
      row.forEach((id) => {
        for (const i of perishablesOf(data.dishes[id], data.ingredients))
          expect(windowForDay(data.ingredients[i.ingredientId], (day % 7) + 1), `${id} day ${day}`).not.toBeNull();
      }),
    );
  });
  it("puts fragile items (shelf life <= 2 days) only on Sat/Sun or after the top-up", () => {
    SEED_ROTATION.forEach((row, day) =>
      row.forEach((id) => {
        for (const i of perishablesOf(data.dishes[id], data.ingredients))
          if (data.ingredients[i.ingredientId].shelfLifeDays <= 2) expect([1, 2, 5, 6]).toContain((day % 7) + 1);
      }),
    );
  });
  it("keeps long-effort dishes on weekends and slots correct", () => {
    SEED_ROTATION.forEach((row, day) =>
      row.forEach((id, s) => {
        expect(data.dishes[id].slots).toContain(SLOTS[s]);
        if (data.dishes[id].effort === "long") expect([0, 1]).toContain(day % 7);
      }),
    );
  });
});

describe("weekly draft", () => {
  it("drafts 21 meals for Sat..Fri", () => {
    const meals = draft();
    expect(meals).toHaveLength(21);
    expect(meals[0].date).toBe(ANCHOR);
    expect(meals[20].date).toBe(addDays(ANCHOR, 6));
  });
  it("replaces a dish eaten in the previous 10 days", () => {
    const first = draft()[0]; // Sat breakfast from the rotation
    const prior = [meal(addDays(ANCHOR, -3), "breakfast", first.dishId)];
    const again = draft(ANCHOR, prior)[0];
    expect(again.dishId).not.toBe(first.dishId);
  });
  it("swaps out disliked dishes", () => {
    const first = draft()[0];
    const d2 = { ...data, dishes: { ...data.dishes, [first.dishId]: { ...data.dishes[first.dishId], rating: -3 } } };
    const meals = draftWeek(ANCHOR, SEED_ROTATION, { ...d2, meals: {} }).meals;
    expect(meals[0].dishId).not.toBe(first.dishId);
  });
});

describe("shopping lists", () => {
  const meals = draft();
  const lists = buildShoppingLists({
    ...data, weekStart: ANCHOR, meals, ticks: new Set(), staples: {}, missing: [], pickupDone: false,
  });
  const all = [...lists.grocer, ...lists.blinkit, ...lists.topup, ...lists.staples];

  it("has no duplicate items across the weekly order lists, nor within the top-up", () => {
    // The Tuesday top-up may legitimately re-buy a fragile item (fresh coriander for Thursday).
    const weekly = [...lists.grocer, ...lists.blinkit, ...lists.staples].map((i) => i.ingredientId);
    expect(new Set(weekly).size).toBe(weekly.length);
    const topup = lists.topup.map((i) => i.ingredientId);
    expect(new Set(topup).size).toBe(topup.length);
    for (const it of lists.topup) expect(data.ingredients[it.ingredientId].category).not.toBe("staple");
  });
  it("only computes fresh items from the menu; staples only appear by restock cycle", () => {
    for (const it of all) {
      const ing = data.ingredients[it.ingredientId];
      if (ing.category === "staple") {
        expect(it.usedFor).toHaveLength(0);
        expect(stapleDue(ing, undefined, ANCHOR)).toBe(true);
      } else {
        expect(it.usedFor.length).toBeGreaterThan(0);
      }
    }
  });
  it("orders nothing the menu does not need", () => {
    const needed = new Set(
      meals.flatMap((m) => data.dishes[m.dishId].ingredients.map((i) => i.ingredientId)),
    );
    for (const it of all)
      if (data.ingredients[it.ingredientId].category !== "staple") expect(needed.has(it.ingredientId)).toBe(true);
  });
  it("never puts milk or home-set curd on a list", () => {
    expect(all.find((i) => i.ingredientId === "milk" || i.ingredientId === "curd")).toBeUndefined();
  });
  it("routes a fragile item needed late in the week to the top-up", () => {
    const thu = addDays(ANCHOR, 5);
    const custom = meals.map((m) => (m.date === thu && m.slot === "lunch" ? { ...m, dishId: "aloo_methi" } : m));
    const l = buildShoppingLists({ ...data, weekStart: ANCHOR, meals: custom, ticks: new Set(), staples: {}, missing: [], pickupDone: false });
    expect(l.topup.find((i) => i.ingredientId === "methi")).toBeDefined();
  });
  it("scales with servings and moves unreceived items to top-up with at-risk meals", () => {
    const sat = meals.filter((m) => m.date === ANCHOR);
    const paneerMeal = meal(ANCHOR, "lunch", "palak_paneer", { servings: 4 });
    const custom = [...sat.filter((m) => m.slot !== "lunch"), paneerMeal];
    const l = buildShoppingLists({ ...data, weekStart: ANCHOR, meals: custom, ticks: new Set(), staples: {}, missing: [], pickupDone: true });
    expect(l.blinkit.find((i) => i.ingredientId === "paneer")?.packs).toBe(2); // 400 g
    expect(l.topup.find((i) => i.ingredientId === "paneer")?.note).toBe("Not received at pickup");
    expect(l.atRisk.some((r) => r.dishId === "palak_paneer")).toBe(true);
  });
  it("puts staples due by cycle or reported low on the staples list", () => {
    const l = buildShoppingLists({
      ...data, weekStart: ANCHOR, meals: [], ticks: new Set(), missing: [], pickupDone: false,
      staples: {
        atta: { ingredientId: "atta", lastBought: addDays(ANCHOR, -20), lowReportedAt: null },
        toor_dal: { ingredientId: "toor_dal", lastBought: addDays(ANCHOR, -2), lowReportedAt: null },
        besan: { ingredientId: "besan", lastBought: addDays(ANCHOR, -2), lowReportedAt: "2026-11-13T10:00:00Z" },
      },
    });
    const ids = l.staples.map((i) => i.ingredientId);
    expect(ids).toContain("atta");
    expect(ids).toContain("besan");
    expect(ids).not.toContain("toor_dal");
    expect(l.grocer.map((i) => i.ingredientId)).toContain("onion");
  });
});

describe("eating out", () => {
  it("moves a fresh dish to a later staples-only meal in the same delivery window", () => {
    const meals = [
      meal(ANCHOR, "dinner", "palak_paneer"),
      meal(addDays(ANCHOR, 1), "lunch", "batata_shaak"),
      meal(addDays(ANCHOR, 1), "dinner", "dal_khichdi"),
    ];
    const r = planEatingOut(data, meals, ANCHOR, "dinner");
    expect(r.skipped.status).toBe("skipped");
    expect(r.moved?.to.dishId).toBe("palak_paneer");
    expect(r.moved?.to.date).toBe(addDays(ANCHOR, 1));
    expect(r.moved?.replacedDishId).toBe("batata_shaak");
  });
  it("does not move palak past its 2-day shelf life", () => {
    const meals = [meal(addDays(ANCHOR, 1), "dinner", "palak_paneer"), meal(addDays(ANCHOR, 2), "dinner", "dal_khichdi")];
    const r = planEatingOut(data, meals, addDays(ANCHOR, 1), "dinner");
    expect(r.moved).toBeUndefined();
    expect(r.stranded).toContain("palak");
  });
  it("just skips a staples-only meal", () => {
    const r = planEatingOut(data, [meal(ANCHOR, "dinner", "dal_khichdi")], ANCHOR, "dinner");
    expect(r.moved).toBeUndefined();
    expect(r.stranded).toHaveLength(0);
  });
});

describe("cook messages", () => {
  const meals = byKey(draft());
  it("daily message has all three meals and Plan Bs", () => {
    const msg = dailyMessage(data, meals, addDays(ANCHOR, -1));
    expect(msg).toContain("Nashta:");
    expect(msg).toContain("Dopahar:");
    expect(msg).toContain("Raat:");
    expect(msg.match(/Plan B:/g)?.length).toBe(3);
  });
  it("includes tonight's soaking for tomorrow's rajma", () => {
    const tue = addDays(ANCHOR, 3);
    const m = { ...meals, [mealKey(tue, "lunch")]: meal(tue, "lunch", "rajma_chawal") };
    const tasks = prepTasksForEvening(data, m, addDays(tue, -1));
    expect(tasks.find((t) => t.dishId === "rajma_chawal")?.when).toBe("tonight");
    expect(dailyMessage(data, m, addDays(tue, -1))).toContain("rajma paani mein bhigo dena");
  });
  it("tells the cook two evenings ahead to start batter for breakfast uttapam", () => {
    const wed = addDays(ANCHOR, 4);
    const m = { [mealKey(wed, "breakfast")]: meal(wed, "breakfast", "uttapam") };
    const tasks = prepTasksForEvening(data, m, addDays(wed, -2));
    expect(tasks[0]?.when).toBe("tomorrowMorning");
    expect(prepTasksForEvening(data, m, addDays(wed, -1))).toHaveLength(0);
  });
  it("shows Plan B as the dish when Plan B is active, and skipped meals", () => {
    const d = addDays(ANCHOR, 1);
    const m = {
      [mealKey(d, "breakfast")]: meal(d, "breakfast", "avocado_toast", { planB: true }),
      [mealKey(d, "dinner")]: meal(d, "dinner", "pav_bhaji", { status: "skipped" }),
    };
    const msg = dailyMessage(data, m, ANCHOR);
    expect(msg).toContain(`Nashta: ${data.dishes.besan_chilla.nameCook}`);
    expect(msg).toContain("bahar kha rahe hain");
  });
  it("week overview lists 7 days", () => {
    const msg = weekOverviewMessage(data, meals, ANCHOR);
    expect(msg.match(/\*/g)?.length).toBe(14);
  });
  it("builds wa.me links with country code", () => {
    expect(waLink("98200 12345", "hi")).toBe("https://wa.me/919820012345?text=hi");
  });
});

describe("cook replies", () => {
  it("understands OK, Plan B and missing items", () => {
    expect(parseCookReply("Ok", data).intent).toBe("ok");
    expect(parseCookReply("theek hai 👍", data).intent).toBe("ok");
    expect(parseCookReply("plan b", data).intent).toBe("plan_b");
    const r = parseCookReply("Paneer khatam", data);
    expect(r).toMatchObject({ intent: "missing", ingredientIds: ["paneer"] });
    const r2 = parseCookReply("kothimbir nahi hai", data);
    expect(r2.intent === "missing" && r2.ingredientIds).toContain("coriander");
  });
});

describe("suggestions", () => {
  const meals = draft();
  const ctx = { ...data, meals: byKey(meals), weekApproved: true };
  it("returns up to 5 valid options that respect repeats, slots and shelf life", () => {
    const fri = addDays(ANCHOR, 6);
    const s = suggestDishes(ctx, fri, "dinner");
    expect(s.length).toBeGreaterThanOrEqual(3);
    expect(s.length).toBeLessThanOrEqual(5);
    const weekIds = new Set(meals.map((m) => m.dishId));
    for (const x of s) {
      const d = data.dishes[x.dishId];
      expect(d.slots).toContain("dinner");
      expect(d.effort).not.toBe("long");
      expect(weekIds.has(x.dishId)).toBe(false);
      for (const i of perishablesOf(d, data.ingredients))
        expect(windowForDay(data.ingredients[i.ingredientId], 7)).not.toBeNull();
    }
  });
  it("covers every date of the week", () => {
    for (const d of weekDates(ANCHOR)) for (const slot of SLOTS) expect(suggestDishes(ctx, d, slot).length).toBeGreaterThan(0);
  });
});

describe("cook message languages", () => {
  const meals = byKey(draft());
  const evening = ANCHOR; // Sat night, for Sunday (handvo needs prep tonight)
  it("Hindi uses Devanagari dish names, prep and day names", () => {
    const hi = seedPlannerData({ cookLanguage: "hindi" });
    const msg = dailyMessage(hi, meals, evening);
    expect(msg).toContain("नमस्ते Vimal जी");
    expect(msg).toContain("रविवार 15 नवंबर");
    expect(msg).toContain("नाश्ता: हांडवो");
    expect(msg).toContain("आज रात: हांडवो का आटा दही में मिला के ढक के रख देना");
    expect(msg.match(/Plan B:/g)?.length).toBe(3);
  });
  it("English uses English names and prep text", () => {
    const en = seedPlannerData({ cookLanguage: "english" });
    const msg = dailyMessage(en, meals, evening);
    expect(msg).toContain("Tomorrow, Sunday 15 Nov (2 people):");
    expect(msg).toContain("Breakfast: Dudhi Handvo");
    expect(msg).toContain("Tonight: Mix handvo flour with curd");
  });
  it("every seed dish and prep has a Hindi version", async () => {
    const { DISH_NAME_HI, PREP_HI } = await import("../seed/hindi");
    for (const d of Object.values(data.dishes)) {
      expect(DISH_NAME_HI[d.id], d.id).toBeTruthy();
      if (d.prepAhead) expect(PREP_HI[d.id], d.id).toBeTruthy();
    }
  });
});
