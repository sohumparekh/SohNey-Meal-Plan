// Sides from Neyomi's list. Any meal can get one or more with a tap; they go into the
// cook's message ("+ raita, papad") and their ingredients onto the shopping list.
// Quantities are for 2 people, in each ingredient's recipe unit.
import type { DishIngredient } from "./dishes";

export interface Side {
  id: string;
  nameEn: string;
  nameCook: string;
  emoji: string;
  ingredients: DishIngredient[];
}

const ing = (ingredientId: string, qty: number, optional = false): DishIngredient => ({ ingredientId, qty, optional });

export const SIDES: Side[] = [
  { id: "raita", nameEn: "Raita", nameCook: "Raita", emoji: "🥒", ingredients: [ing("curd", 200), ing("cucumber", 0.5), ing("jeera", 1)] },
  { id: "papad", nameEn: "Papad", nameCook: "Papad", emoji: "🫓", ingredients: [ing("papad", 4)] },
  {
    id: "kanda_tomato_salad", nameEn: "Kanda tomato salad", nameCook: "Kanda tamatar salad", emoji: "🥗",
    ingredients: [ing("onion", 1), ing("tomato", 1), ing("lemon", 0.5), ing("coriander", 0.25, true)],
  },
  { id: "tomato_chutney", nameEn: "Tomato chutney", nameCook: "Tamatar chutney", emoji: "🍅", ingredients: [ing("tomato", 3), ing("garlic", 5), ing("oil", 10)] },
  { id: "achar", nameEn: "Maharashtrian achar", nameCook: "Achar", emoji: "🫙", ingredients: [ing("achar", 20)] },
  { id: "curd", nameEn: "Curd", nameCook: "Dahi", emoji: "🥣", ingredients: [ing("curd", 200)] },
  { id: "aam_ras", nameEn: "Aam ras", nameCook: "Aam ras", emoji: "🥭", ingredients: [ing("mango_pulp", 300)] },
];

export const SIDE_BY_ID: Record<string, Side> = Object.fromEntries(SIDES.map((s) => [s.id, s]));
