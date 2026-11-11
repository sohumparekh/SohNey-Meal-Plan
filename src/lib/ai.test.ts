import { describe, expect, it } from "vitest";
import { sanitize, type DishDraftT } from "./ai";
import { seedPlannerData } from "./core/seedData";
import { perishablesOf } from "./core/shelf";

const data = seedPlannerData();
const base: DishDraftT = {
  nameEn: "Methi Malai Paneer", nameCook: "Methi malai paneer, roti", slots: ["dinner"], cuisine: "Punjabi",
  effort: "medium", kind: "roti_sabzi",
  ingredients: [
    { ingredientId: "paneer", qty: 200, optional: false },
    { ingredientId: "methi", qty: 1, optional: false },
    { ingredientId: "cream", qty: 50, optional: false },
    { ingredientId: "made_up_thing", qty: 10, optional: false },
    { ingredientId: "kasuri methi", qty: 2, optional: false },
  ],
  newIngredients: [],
  prepAhead: null, planBId: "aloo_matar", recipeCook: "1. ...", vegetarian: true,
};

describe("Claude dish draft clean-up", () => {
  it("keeps known ingredients, drops unknown ones, normalises ids", () => {
    const { dish } = sanitize(base, data);
    const ids = dish.ingredients.map((i) => i.ingredientId);
    expect(ids).toEqual(["paneer", "methi", "cream", "kasuri_methi"]);
    expect(dish.id).toBe("methi_malai_paneer");
  });
  it("adds genuinely new ingredients and gives new staples a restock cycle", () => {
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
  it("ignores trivial prep-ahead", () => {
    const { dish } = sanitize({ ...base, prepAhead: { en: "x", cook: "x", leadHours: 1 } }, data);
    expect(dish.prepAhead).toBeUndefined();
  });
});
