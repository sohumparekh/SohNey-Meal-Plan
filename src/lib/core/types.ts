import type { Dish, Slot } from "../seed/dishes";
import type { Ingredient } from "../seed/ingredients";
import type { ISODate } from "./dates";

export type { Dish, Slot, Ingredient };

export const SLOTS: Slot[] = ["breakfast", "lunch", "dinner"];

export type MealStatus = "planned" | "skipped" | "swapped" | "cooked";

export interface Meal {
  date: ISODate;
  slot: Slot;
  dishId: string;
  servings: number;
  status: MealStatus;
  /** Cook should make the Plan B dish instead (e.g. an ingredient ran out). */
  planB: boolean;
  /** The dish the rotation/draft originally put here, if it was changed. */
  originalDishId?: string | null;
  /** Egg breakfasts are for Sohum only: this is Neyomi's egg-free dish alongside. */
  altDishId?: string | null;
  /** Side dishes added to this meal (ids from seed/sides.ts). */
  sides?: string[];
  updatedAt?: string;
}

export type WeekStatus = "draft" | "approved";
export interface Week {
  weekStart: ISODate;
  rotationWeek: number;
  status: WeekStatus;
  approvedAt?: string | null;
  pickupDoneAt?: string | null;
}

export type CookLanguage = "hinglish" | "hindi" | "english";

export interface Settings {
  householdName: string;
  cookName: string;
  cookPhone: string;
  cookLanguage: CookLanguage;
  grocerName: string;
  grocerPhone: string;
  servingsDefault: number;
  noRepeatDays: number;
  /** A Saturday that is "week 1" of the rotation. */
  rotationAnchor: ISODate;
  topupEnabled: boolean;
  /** Where items sold in both places (pav, sev, mushrooms...) are ordered. */
  eitherGoesTo: "blinkit" | "grocer";
  blinkitLinks: boolean;
  /** Reminders, India time ("HH:MM"). Days: 0 = Sunday ... 6 = Saturday. */
  remindersOn: boolean;
  dailyMenuTime: string;
  dinnerCheckTime: string;
  planWeekDay: number;
  planWeekTime: string;
  groceryDay: number;
  groceryTime: string;
  mealHours: Record<Slot, number>;
  /** Who eats eggs (egg dishes are for this person only) and who doesn't. */
  eggEater: string;
  nonEggEater: string;
  /** Bought every week regardless of the menu (e.g. Sohum's breakfast berries). */
  weeklyExtras: { ingredientId: string; packs: number }[];
}

export const DEFAULT_SETTINGS: Settings = {
  householdName: "Home",
  cookName: "Vimal",
  cookPhone: "",
  cookLanguage: "hinglish",
  grocerName: "Shubham Vegetable",
  grocerPhone: "8657652535",
  servingsDefault: 2,
  noRepeatDays: 10,
  rotationAnchor: "2026-11-14",
  topupEnabled: true,
  eitherGoesTo: "blinkit",
  blinkitLinks: true,
  remindersOn: true,
  dailyMenuTime: "21:00",
  dinnerCheckTime: "16:00",
  planWeekDay: 4,
  planWeekTime: "20:00",
  groceryDay: 5,
  groceryTime: "10:00",
  mealHours: { breakfast: 8, lunch: 12, dinner: 20 },
  eggEater: "Sohum",
  nonEggEater: "Neyomi",
  weeklyExtras: [
    { ingredientId: "blueberries", packs: 2 },
    { ingredientId: "vanilla_ice_cream", packs: 1 },
    { ingredientId: "greek_yogurt", packs: 4 },
  ],
};

export interface StapleState {
  ingredientId: string;
  lastBought: ISODate | null;
  lowReportedAt: string | null;
}

export interface MissingItem {
  id: number;
  date: ISODate;
  ingredientId: string;
  resolved: boolean;
}

export type ListName = "grocer" | "blinkit" | "topup" | "staples";

/** Everything the pure planner functions need, loaded once per request. */
export interface PlannerData {
  dishes: Record<string, Dish>;
  ingredients: Record<string, Ingredient>;
  settings: Settings;
}

export const mealKey = (date: ISODate, slot: Slot) => `${date}|${slot}`;
