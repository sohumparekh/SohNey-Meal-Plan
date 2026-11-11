// Generates the default 28-day rotating menu from the dish library.
//
// Calendar model: the weekly order is picked up from the office grocer on Friday evening
// (Blinkit weekly order lands the same evening). The cook's Friday dinner is made before
// that bag reaches home, so a planning week runs Saturday (day 1) to Friday (day 7).
// "dayInWeek" therefore equals days since the weekly delivery.
// An optional Tuesday-evening top-up makes fresh items available from Wednesday (day 5).

import { DISHES, DISH_BY_ID, type Dish, type Slot } from "../seed/dishes";
import { INGREDIENT_BY_ID } from "../seed/ingredients";

export const SLOTS: Slot[] = ["breakfast", "lunch", "dinner"];
export const WEEK_DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export const TOPUP_FIRST_DAY = 5; // Wed, items bought Tue evening
const DAYS = 28;

export interface RotationConfig {
  noRepeatDays: number;
  seed: number;
  restarts: number;
  iterations: number;
}
export const DEFAULT_CONFIG: RotationConfig = { noRepeatDays: 10, seed: 20261111, restarts: 6, iterations: 80000 };

export type Plan = string[][]; // [day 0..27][slot 0..2] -> dish id

const HERBS = new Set(["coriander", "mint", "spring_onion", "curry_leaves"]);

/** Dishes named in the household's current repertoire: each must appear at least once in 28 days. */
export const FAVOURITES = new Set([
  "kanda_poha", "batata_poha", "upma", "avocado_toast", "uttapam", "rava_uttapam", "masala_bhakri", "methi_thepla",
  "besan_chilla", "moong_chilla", "sheera", "sabudana_khichdi", "idli_sambar", "masala_dosa", "veg_sandwich",
  "palak_paneer", "jeera_aloo", "kobi_shaak", "bhinda_shaak", "tindora_shaak", "dudhi_chana", "sev_tameta",
  "ringan_bateta", "gawar_shaak", "mix_veg", "gujarati_dal_bhaat", "tadka_dal_rice", "dal_khichdi", "kadhi_khichdi",
  "rajma_chawal", "chole", "mushroom_rice", "veg_fried_rice", "veg_pulao", "manchurian_rice", "chilli_paneer",
  "hakka_noodles", "flat_noodles", "korean_noodles", "vada_pav", "pav_bhaji", "misal_pav", "sev_puri", "pani_puri",
  "bhel_puri", "thalipeeth_pithla", "pasta_arrabbiata",
]);

export const dayInWeek = (day: number) => (day % 7) + 1; // 1..7
export const isWeekend = (day: number) => day % 7 <= 1; // Sat, Sun
export const isStreet = (d: Dish) => d.cuisine === "Chaat & street" || d.id === "misal_pav";
export const isAsian = (d: Dish) => d.cuisine === "Indo-Chinese" || d.cuisine === "Asian noodles";
export const usesPaneer = (d: Dish) => d.ingredients.some((i) => i.ingredientId === "paneer" && !i.optional);

/** Dishes that feel "the same again" to eat within a couple of days. */
export const family = (d: Dish): string | null =>
  d.id === "sabudana_khichdi" ? null
  : d.id.includes("khichdi") ? "khichdi"
  : d.id.includes("pulao") || d.id.includes("fried_rice") || ["schezwan_rice", "manchurian_rice", "chilli_paneer"].includes(d.id) ? "pulao_fried_rice"
  : d.id.includes("uttapam") || d.id.includes("dosa") || d.id.includes("idli") ? "dosa_batter"
  : d.id.includes("paratha") ? "paratha"
  : d.id.includes("paneer_bhurji") ? "paneer_bhurji"
  : d.id.includes("pasta") ? "pasta"
  : d.id.includes("noodles") ? "noodles"
  : null;
export const isRiceMeal = (d: Dish) =>
  d.ingredients.some((i) => (i.ingredientId === "rice" || i.ingredientId === "basmati") && i.qty >= 100);

/** Fresh/specialty, non-optional ingredients that the shelf-life rule applies to. */
export function perishables(d: Dish) {
  return d.ingredients.filter((i) => !i.optional && INGREDIENT_BY_ID[i.ingredientId].category !== "staple");
}

/** "main" fresh ingredients, used to avoid e.g. paneer or cabbage two days running. */
function mainIngredients(d: Dish): string[] {
  return perishables(d)
    .filter((i) => {
      const ing = INGREDIENT_BY_ID[i.ingredientId];
      if (HERBS.has(ing.id)) return false;
      if (["paneer", "avocado", "pav", "bharta_brinjal", "mushroom"].includes(ing.id)) return true;
      if (ing.unit === "g") return i.qty >= 200;
      if (ing.unit === "bunch") return i.qty >= 1;
      return false;
    })
    .map((i) => i.ingredientId);
}

export type Window = "main" | "topup";
/** Which delivery window can supply this ingredient on this day, or null if none can. */
export function windowFor(ingredientId: string, day: number): Window | null {
  const k = dayInWeek(day);
  const shelf = INGREDIENT_BY_ID[ingredientId].shelfLifeDays;
  if (k <= shelf) return "main";
  if (k >= TOPUP_FIRST_DAY && k - (TOPUP_FIRST_DAY - 1) <= shelf) return "topup";
  return null;
}

export function shelfFeasible(d: Dish, day: number) {
  return perishables(d).every((i) => windowFor(i.ingredientId, day) !== null);
}

function effortOk(d: Dish, day: number) {
  return d.effort !== "long" || isWeekend(day);
}

const cyclicDist = (a: number, b: number) => {
  const x = Math.abs(a - b) % DAYS;
  return Math.min(x, DAYS - x);
};

// ---------------------------------------------------------------- scoring

export interface ScoreBreakdown {
  total: number;
  hard: number;
  parts: Record<string, number>;
}

export function scorePlan(plan: Plan, cfg: RotationConfig): ScoreBreakdown {
  const parts: Record<string, number> = {};
  const add = (k: string, v: number) => (parts[k] = (parts[k] ?? 0) + v);
  let hard = 0;

  // occurrences per dish
  const occ: Record<string, number[]> = {};
  plan.forEach((row, day) => row.forEach((id) => (occ[id] ??= []).push(day)));

  for (const [id, days] of Object.entries(occ)) {
    for (let a = 0; a < days.length; a++)
      for (let b = a + 1; b < days.length; b++)
        if (cyclicDist(days[a], days[b]) < cfg.noRepeatDays) hard++;
    add("repeats", (days.length - 1) * 6);
    void id;
  }
  for (const f of FAVOURITES) if (!occ[f]) add("missingFavourite", 25);

  for (let day = 0; day < DAYS; day++) {
    const [b, l, dn] = plan[day].map((id) => DISH_BY_ID[id]);
    const prevDinner = DISH_BY_ID[plan[(day + DAYS - 1) % DAYS][2]];
    if (prevDinner.cuisine === dn.cuisine) hard++;
    for (const d of [b, l, dn]) {
      if (!effortOk(d, day)) hard++;
      if (!shelfFeasible(d, day)) hard++;
    }
    const preps = [b, l, dn].filter((d) => d.prepAhead).length;
    if (preps > 1) add("prepCrowding", (preps - 1) * 8);
    if (l.cuisine === dn.cuisine) add("sameCuisineLunchDinner", 3);
    if (b.cuisine === l.cuisine) add("sameCuisineBreakfastLunch", 3);
    const fams = [b, l, dn].map(family).filter(Boolean);
    if (new Set(fams).size < fams.length) add("familySameDay", 15);
    for (const f of new Set(fams))
      for (const off of [1, 2])
        if (plan[(day + off) % DAYS].some((id) => family(DISH_BY_ID[id]) === f)) add("familyTooClose", 10);
    if (l.kind === "dal_rice" && dn.kind === "dal_rice") add("twoDalRiceSameDay", 3);
    if (isRiceMeal(l) && isRiceMeal(dn)) add("riceTwiceSameDay", 12);
    const prevB = DISH_BY_ID[plan[(day + DAYS - 1) % DAYS][0]];
    if (prevB.cuisine === b.cuisine) add("breakfastSameCuisine", 2);
    if (isWeekend(day) && (dn.effort === "long" || isStreet(dn))) add("weekendTreatBonus", -3);
    if (!isWeekend(day) && isStreet(dn)) add("weekdayStreet", 2);
  }

  // main ingredient repeated within 2 days
  const mainsList = plan.map((row) => row.flatMap((id) => [...new Set(mainIngredients(DISH_BY_ID[id]))]));
  mainsList.forEach((l) => { if (new Set(l).size < l.length) add("mainSameDay", (l.length - new Set(l).size) * 12); });
  const mains = mainsList.map((l) => new Set(l));
  for (let day = 0; day < DAYS; day++)
    for (const off of [1, 2]) {
      const other = mains[(day + off) % DAYS];
      for (const m of mains[day]) if (other.has(m)) add("mainRepeat", 6);
    }

  for (let w = 0; w < 4; w++) {
    const days = plan.slice(w * 7, w * 7 + 7);
    const lunches = days.map((r) => DISH_BY_ID[r[1]]);
    const dinners = days.map((r) => DISH_BY_ID[r[2]]);
    const all = days.flat().map((id) => DISH_BY_ID[id]);

    const rs = lunches.filter((d) => d.kind === "roti_sabzi").length;
    add("lunchRotiSabziTarget", Math.abs(rs - 5) * 5);
    const otherLunch = lunches.filter((d) => d.kind === "other").length;
    if (otherLunch > 1) add("lunchOther", (otherLunch - 1) * 4);

    const street = dinners.filter(isStreet).length;
    if (street < 2) add("fewStreetNights", (2 - street) * 10);
    if (street > 2) add("tooMuchStreet", (street - 2) * 10);
    const asian = dinners.filter(isAsian).length;
    if (asian === 0) add("noAsianNight", 12);
    if (asian > 2) add("tooMuchAsian", (asian - 2) * 8);
    const cuisineCount: Record<string, number> = {};
    dinners.forEach((d) => (cuisineCount[d.cuisine] = (cuisineCount[d.cuisine] ?? 0) + 1));
    for (const c of Object.values(cuisineCount)) if (c > 2) add("dinnerCuisineCrowding", (c - 2) * 6);
    if (!dinners.some((d) => d.kind === "roti_sabzi")) add("noRotiSabziDinner", 5);

    const paneer = all.filter(usesPaneer).length;
    if (paneer > 2) add("paneerOveruse", (paneer - 2) * 10);

    // purchase rounding, waste and top-up
    const need: Record<string, number> = {};
    const optional: Record<string, number> = {};
    days.forEach((row, i) => {
      const day = w * 7 + i;
      for (const id of row)
        for (const ing of DISH_BY_ID[id].ingredients) {
          if (INGREDIENT_BY_ID[ing.ingredientId].category === "staple") continue;
          const win = windowFor(ing.ingredientId, day);
          if (!win) continue; // hard violation already counted (or optional garnish skipped)
          const key = `${win}:${ing.ingredientId}`;
          if (ing.optional) optional[key] = (optional[key] ?? 0) + ing.qty;
          else need[key] = (need[key] ?? 0) + ing.qty;
        }
    });
    const topupItems = new Set<string>();
    for (const [key, qty] of Object.entries(need)) {
      const [win, id] = key.split(":");
      const pack = INGREDIENT_BY_ID[id].pack;
      const packs = Math.ceil(qty / pack - 1e-9);
      const leftover = Math.max(0, packs * pack - qty - (optional[key] ?? 0));
      add("waste", (leftover / pack) * 8);
      if (win === "topup") topupItems.add(id);
    }
    if (topupItems.size > 0) add("topupNeeded", 10 + topupItems.size * 10);
  }

  const soft = Object.values(parts).reduce((a, b) => a + b, 0);
  return { total: hard * 1000 + soft, hard, parts };
}

// ---------------------------------------------------------------- search

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function candidates(slot: Slot, day: number): Dish[] {
  return DISHES.filter((d) => d.slots.includes(slot) && effortOk(d, day) && shelfFeasible(d, day));
}

export function generateRotation(cfg: RotationConfig = DEFAULT_CONFIG) {
  const cand: Dish[][][] = Array.from({ length: DAYS }, (_, day) => SLOTS.map((s) => candidates(s, day)));
  let best: { plan: Plan; score: ScoreBreakdown } | null = null;

  for (let r = 0; r < cfg.restarts; r++) {
    const rand = rng(cfg.seed + r * 7919);
    const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

    // greedy start: avoid recent repeats and same-cuisine dinners where possible
    const plan: Plan = [];
    for (let day = 0; day < DAYS; day++) {
      const row: string[] = [];
      SLOTS.forEach((_, s) => {
        const recent = new Set(plan.slice(Math.max(0, day - cfg.noRepeatDays + 1)).flat().concat(row));
        let pool = cand[day][s].filter((d) => !recent.has(d.id));
        if (s === 2 && day > 0) {
          const prev = DISH_BY_ID[plan[day - 1][2]].cuisine;
          const p2 = pool.filter((d) => d.cuisine !== prev);
          if (p2.length) pool = p2;
        }
        row.push(pick(pool.length ? pool : cand[day][s]).id);
      });
      plan.push(row);
    }

    // local search: single-slot replacement and same-slot swaps
    let cur = scorePlan(plan, cfg);
    for (let it = 0; it < cfg.iterations; it++) {
      const day = Math.floor(rand() * DAYS);
      const s = Math.floor(rand() * 3);
      if (rand() < 0.6) {
        const old = plan[day][s];
        plan[day][s] = pick(cand[day][s]).id;
        const sc = scorePlan(plan, cfg);
        if (sc.total <= cur.total) cur = sc;
        else plan[day][s] = old;
      } else {
        const day2 = Math.floor(rand() * DAYS);
        const a = plan[day][s], b = plan[day2][s];
        if (!cand[day][s].some((d) => d.id === b) || !cand[day2][s].some((d) => d.id === a)) continue;
        plan[day][s] = b; plan[day2][s] = a;
        const sc = scorePlan(plan, cfg);
        if (sc.total <= cur.total) cur = sc;
        else { plan[day][s] = a; plan[day2][s] = b; }
      }
    }
    if (!best || cur.total < best.score.total) best = { plan: plan.map((r) => [...r]), score: cur };
  }
  return best!;
}
