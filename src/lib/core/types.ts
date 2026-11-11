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

export interface Settings {
  householdName: string;
  cookName: string;
  cookPhone: string;
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
  /** Schedule, India time. Days: 0 = Sunday ... 6 = Saturday. */
  draftDay: number;
  draftTime: string;
  approveReminderDay: number;
  approveReminderTime: string;
  nightlyTime: string;
  dinnerCheckTime: string;
  topupCheckDay: number;
  topupCheckTime: string;
  mealHours: Record<Slot, number>;
}

export const DEFAULT_SETTINGS: Settings = {
  householdName: "Home",
  cookName: "Vimal",
  cookPhone: "",
  grocerName: "Shubham Vegetable",
  grocerPhone: "8657652535",
  servingsDefault: 2,
  noRepeatDays: 10,
  rotationAnchor: "2026-11-14",
  topupEnabled: true,
  eitherGoesTo: "blinkit",
  blinkitLinks: true,
  draftDay: 4,
  draftTime: "20:00",
  approveReminderDay: 5,
  approveReminderTime: "09:00",
  nightlyTime: "21:00",
  dinnerCheckTime: "16:00",
  topupCheckDay: 2,
  topupCheckTime: "10:00",
  mealHours: { breakfast: 8, lunch: 12, dinner: 20 },
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
