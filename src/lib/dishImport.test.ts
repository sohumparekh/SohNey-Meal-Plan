import { describe, expect, it } from "vitest";
import { buildClaudePrompt, parseDraft, sanitize, type DishDraftT } from "./dishImport";
import { seedPlannerData } from "./core/seedData";
import { perishablesOf } from "./core/shelf";

const data = seedPlannerData();
const base: DishDraftT = {
  nameEn: "Methi Malai Paneer + Roti", nameCook: "Methi malai paneer, roti", nameCookHi: null, slots: ["dinner"], cuisine: "Punjabi",
  effort: "medium", kind: "roti_sabzi",
  ingredients: [
    { ingredientId: "paneer", qty: 200, optional: false },
    { ingredientId: "methi", qty: 1, optional: false },
    { ingredientId: "cream", qty: 50, optional: false },
    { ingredientId: "made_up_thing", qty: 10, optional: false },
    { ingredientId: "kasuri methi", qty: 2, optional: false },
  ],
  newIngredients: [],
  prepAhead: null, planBId: "aloo_matar", recipeCook: "1. ...",
};

describe("Add with Claude", () => {
  it("prompt contains the request, the format and the catalogue", () => {
    const p = buildClaudePrompt("Methi malai paneer", data);
    expect(p).toContain("Dish: Methi malai paneer");
    expect(p).toContain('"planBId"');
    expect(p).toContain("paneer | Paneer | g");
    expect(p).toContain("aloo_matar |");
    expect(p).not.toContain("pav_bhaji |"); // not staples-only, so not a valid Plan B
  });
  it("accepts JSON wrapped in a markdown fence with extra text", () => {
    const reply = "Here you go:\n```json\n" + JSON.stringify(base) + "\n```\nEnjoy!";
    const { dish } = parseDraft(reply, data);
    expect(dish.id).toBe("methi_malai_paneer");
  });
  it("explains what is wrong with invalid replies", () => {
    expect(() => parseDraft("sorry I can't", data)).toThrow(/No JSON/);
    expect(() => parseDraft(JSON.stringify({ ...base, slots: [] }), data)).toThrow(/slots/);
  });
  it("keeps known ingredients, drops unknown ones, normalises ids", () => {
    const { dish, dropped } = sanitize(base, data);
    expect(dish.ingredients.map((i) => i.ingredientId)).toEqual(["paneer", "methi", "cream", "kasuri_methi"]);
    expect(dropped).toEqual(["made_up_thing"]);
  });
  it("adds new ingredients and gives new staples a restock cycle", () => {
    const { dish, newIngredients } = sanitize({
      ...base,
      ingredients: [...base.ingredients, { ingredientId: "Truffle Oil", qty: 5, optional: true }],
      newIngredients: [{ id: "truffle_oil", nameEn: "Truffle oil", nameCook: "Truffle oil", category: "staple", source: "blinkit", unit: "ml", pack: 100, packLabel: "100 ml", shelfLifeDays: 180 }],
    }, data);
    expect(newIngredients[0]).toMatchObject({ id: "truffle_oil", restockDays: 30 });
    expect(dish.ingredients.some((i) => i.ingredientId === "truffle_oil")).toBe(true);
  });
  it("forces a staples-only Plan B and a unique id", () => {
    const { dish } = sanitize({ ...base, nameEn: "Palak Paneer", planBId: "pav_bhaji" }, data);
    expect(dish.id).toBe("palak_paneer_2");
    expect(perishablesOf(data.dishes[dish.planBId], data.ingredients)).toHaveLength(0);
  });
});
