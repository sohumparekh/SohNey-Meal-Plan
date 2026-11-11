import { DISHES } from "../seed/dishes";
import { INGREDIENTS } from "../seed/ingredients";
import rotationJson from "../seed/rotation.json";
import type { Rotation } from "./draft";
import { DEFAULT_SETTINGS, type PlannerData, type Settings } from "./types";

export const SEED_ROTATION = rotationJson as Rotation;

/** Planner data straight from the seed files (used by tests and the first DB seed). */
export function seedPlannerData(settings: Partial<Settings> = {}): PlannerData {
  return {
    dishes: Object.fromEntries(DISHES.map((d) => [d.id, { ...d, active: true, rating: 0, lastCookedAt: null }])),
    ingredients: Object.fromEntries(INGREDIENTS.map((i) => [i.id, i])),
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}
