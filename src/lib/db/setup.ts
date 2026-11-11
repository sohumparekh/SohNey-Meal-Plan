// Creates tables and loads the seed library. Idempotent: existing rows (and any edits
// made in the app) are left alone.
import { todayIST } from "../core/dates";
import { SEED_ROTATION } from "../core/seedData";
import { DEFAULT_SETTINGS, SLOTS } from "../core/types";
import { DISHES } from "../seed/dishes";
import { INGREDIENTS } from "../seed/ingredients";
import { sql } from "./client";
import { SCHEMA_SQL } from "./schema";

export async function setupDatabase() {
  const db = sql();
  await db.unsafe(SCHEMA_SQL);
  // additive migrations for databases created by an older version go here

  let ingredients = 0, dishes = 0, rotation = 0;
  await db.begin(async (tx) => {
    for (const i of INGREDIENTS) {
      const r = await tx`insert into ingredients (id, name_en, name_cook, category, source, unit, pack, pack_label,
          shelf_life_days, restock_days, restock_qty)
        values (${i.id}, ${i.nameEn}, ${i.nameCook}, ${i.category}, ${i.source}, ${i.unit}, ${i.pack}, ${i.packLabel},
          ${i.shelfLifeDays}, ${i.restockDays ?? null}, ${i.restockQty ?? null})
        on conflict (id) do nothing returning id`;
      ingredients += r.length;
    }
    for (const d of DISHES) {
      const r = await tx`insert into dishes (id, name_en, name_cook, slots, cuisine, effort, kind, ingredients,
          prep_ahead, plan_b_id)
        values (${d.id}, ${d.nameEn}, ${d.nameCook}, ${d.slots}, ${d.cuisine}, ${d.effort}, ${d.kind},
          ${tx.json(d.ingredients as never)}, ${d.prepAhead ? tx.json(d.prepAhead as never) : null}, ${d.planBId})
        on conflict (id) do nothing returning id`;
      dishes += r.length;
    }
    const [{ n }] = await tx`select count(*)::int as n from rotation`;
    if (n === 0)
      for (let day = 0; day < 28; day++)
        for (let s = 0; s < 3; s++) {
          await tx`insert into rotation (week_no, day_idx, slot, dish_id)
            values (${Math.floor(day / 7) + 1}, ${day % 7}, ${SLOTS[s]}, ${SEED_ROTATION[day][s]})`;
          rotation++;
        }
    await tx`insert into settings (id, data) values (1, ${tx.json(DEFAULT_SETTINGS as never)}) on conflict do nothing`;
    // Assume the pantry is stocked today: dry staples start their restock cycle now.
    // Weekly basics (onion, potato...) get no row, so they are due every week.
    const today = todayIST();
    for (const i of INGREDIENTS)
      if (i.category === "staple" && (i.restockDays ?? 0) > 7)
        await tx`insert into staples (ingredient_id, last_bought) values (${i.id}, ${today}) on conflict do nothing`;
  });
  return { ingredients, dishes, rotation };
}
