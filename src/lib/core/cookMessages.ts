// Messages for the cook, in simple Hindi written in English letters.
import { addDays, dayNameHi, shortDate, weekDates, type ISODate } from "./dates";
import { SLOTS, mealKey, type Dish, type Meal, type PlannerData, type Slot } from "./types";

const SLOT_HI: Record<Slot, string> = { breakfast: "Nashta", lunch: "Dopahar", dinner: "Raat" };
const SLOT_HI_LONG: Record<Slot, string> = { breakfast: "nashte", lunch: "dopahar ke khane", dinner: "raat ke khane" };
const SLOT_ICON: Record<Slot, string> = { breakfast: "☀️", lunch: "🍛", dinner: "🌙" };

export const dayLabelHi = (d: ISODate) => `${dayNameHi(d)} ${shortDate(d)}`;

/** The dish the cook should actually make (Plan B if switched). */
export function effectiveDish(data: PlannerData, meal: Meal): Dish | undefined {
  const dish = data.dishes[meal.dishId];
  if (meal.planB && dish) return data.dishes[dish.planBId] ?? dish;
  return dish;
}

export interface PrepTask {
  forDate: ISODate;
  forSlot: Slot;
  dishId: string;
  when: "Aaj raat" | "Kal subah" | "Kal dopahar" | "Kal shaam";
  textCook: string;
  textEn: string;
}

/**
 * Prep jobs to put in the message sent on the evening of `evening`.
 * A prep task starts `leadHours` before the meal; starts between 10 pm and 7 am are
 * moved to the previous night. The message covers tasks starting from that evening
 * until the next evening's message.
 */
export function prepTasksForEvening(data: PlannerData, meals: Record<string, Meal>, evening: ISODate): PrepTask[] {
  const tasks: PrepTask[] = [];
  const windowStart = Date.parse(`${evening}T18:00:00Z`);
  const windowEnd = windowStart + 24 * 3600 * 1000;
  for (const off of [1, 2, 3]) {
    const d = addDays(evening, off);
    for (const slot of SLOTS) {
      const meal = meals[mealKey(d, slot)];
      if (!meal || meal.status === "skipped" || meal.planB) continue;
      const dish = data.dishes[meal.dishId];
      if (!dish?.prepAhead) continue;
      const mealTime = Date.parse(`${d}T${String(data.settings.mealHours[slot]).padStart(2, "0")}:00:00Z`);
      let start = new Date(mealTime - dish.prepAhead.leadHours * 3600 * 1000);
      const h = start.getUTCHours();
      if (h >= 22 || h < 7) {
        // night: do it the previous evening at 9:30 pm
        const day = h >= 22 ? start.toISOString().slice(0, 10) : addDays(start.toISOString().slice(0, 10), -1);
        start = new Date(`${day}T21:30:00Z`);
      }
      const t = start.getTime();
      if (t < windowStart || t >= windowEnd) continue;
      const sameEvening = start.toISOString().slice(0, 10) === evening;
      const sh = start.getUTCHours();
      const when: PrepTask["when"] = sameEvening ? "Aaj raat" : sh < 12 ? "Kal subah" : sh < 17 ? "Kal dopahar" : "Kal shaam";
      tasks.push({
        forDate: d, forSlot: slot, dishId: dish.id, when,
        textCook: dish.prepAhead.cook,
        textEn: dish.prepAhead.en,
      });
    }
  }
  return tasks;
}

function mealLines(data: PlannerData, meal: Meal | undefined, slot: Slot, withPlanB: boolean, withRecipe: boolean) {
  const icon = SLOT_ICON[slot];
  if (!meal) return [`${icon} ${SLOT_HI[slot]}: (abhi tay nahi)`];
  if (meal.status === "skipped") return [`${icon} ${SLOT_HI[slot]}: Nahi banana, hum bahar kha rahe hain`];
  const dish = effectiveDish(data, meal);
  if (!dish) return [`${icon} ${SLOT_HI[slot]}: ?`];
  const servings = meal.servings !== data.settings.servingsDefault ? ` (${meal.servings} log)` : "";
  const lines = [`${icon} ${SLOT_HI[slot]}: ${dish.nameCook}${servings}`];
  if (withPlanB && !meal.planB) {
    const pb = data.dishes[dish.planBId];
    if (pb) lines.push(`    Plan B: ${pb.nameCook}`);
  }
  if (withRecipe && dish.recipeCook && !dish.lastCookedAt) {
    lines.push(`    Nayi dish, tarika:`);
    for (const l of dish.recipeCook.split("\n").filter(Boolean)) lines.push(`    ${l.trim()}`);
  }
  return lines;
}

/** The nightly message: tomorrow's three meals with Plan Bs and tonight's prep. */
export function dailyMessage(data: PlannerData, meals: Record<string, Meal>, evening: ISODate) {
  const d = addDays(evening, 1);
  const cook = data.settings.cookName;
  const lines = [`Namaste ${cook} ji 🙏`, `Kal ${dayLabelHi(d)} ka khana (${data.settings.servingsDefault} log):`, ""];
  for (const slot of SLOTS) lines.push(...mealLines(data, meals[mealKey(d, slot)], slot, true, true));
  const prep = prepTasksForEvening(data, meals, evening);
  if (prep.length) {
    lines.push("");
    for (const p of prep) {
      const dish = data.dishes[p.dishId];
      const forWhen = p.forDate === d ? "kal" : dayNameHi(p.forDate);
      lines.push(`📌 ${p.when}: ${p.textCook} (${forWhen} ${SLOT_HI_LONG[p.forSlot]}, ${dish.nameCook} ke liye)`);
    }
  }
  lines.push("", `Koi saamaan khatam ho to Plan B bana lena aur bas "<saamaan> khatam" likh dena. Sab theek ho to "OK" bhej dena.`);
  return lines.join("\n");
}

/** Short reminder for tonight's dinner, sent only when it changed during the day. */
export function dinnerChangeMessage(data: PlannerData, meal: Meal) {
  const cook = data.settings.cookName;
  if (meal.status === "skipped") return `${cook} ji, aaj raat hum bahar kha rahe hain. Dinner mat banana 🙏`;
  const dish = effectiveDish(data, meal);
  const pb = dish && !meal.planB ? data.dishes[dish.planBId] : undefined;
  return [
    `${cook} ji, aaj raat ka khana badal gaya hai 🙏`,
    `🌙 Raat: ${dish?.nameCook ?? "?"}`,
    ...(pb ? [`    Plan B: ${pb.nameCook}`] : []),
  ].join("\n");
}

export function eatingOutMessage(data: PlannerData, meal: Meal, movedTo?: Meal) {
  const cook = data.settings.cookName;
  const when = meal.slot === "dinner" ? "raat" : meal.slot === "lunch" ? "dopahar" : "subah";
  const lines = [`${cook} ji, ${dayLabelHi(meal.date)} ${when} hum bahar kha rahe hain, ${SLOT_HI[meal.slot].toLowerCase()} ka khana mat banana 🙏`];
  if (movedTo) {
    const dish = data.dishes[movedTo.dishId];
    lines.push(`${dish.nameCook} ab ${dayLabelHi(movedTo.date)} ${SLOT_HI[movedTo.slot].toLowerCase()} ko banana hai.`);
  }
  return lines.join("\n");
}

/** One message with the whole week, sent once when the week starts. */
export function weekOverviewMessage(data: PlannerData, meals: Record<string, Meal>, weekStart: ISODate) {
  const lines = [`Namaste ${data.settings.cookName} ji 🙏`, `Is hafte ka menu (${dayLabelHi(weekStart)} se):`, ""];
  for (const d of weekDates(weekStart)) {
    lines.push(`*${dayNameHi(d)}*`);
    for (const slot of SLOTS) {
      const m = meals[mealKey(d, slot)];
      const dish = m ? effectiveDish(data, m) : undefined;
      const txt = !m ? "-" : m.status === "skipped" ? "bahar" : dish?.nameCook ?? "?";
      lines.push(`  ${SLOT_HI[slot]}: ${txt}`);
    }
  }
  lines.push("", "Har raat kal ka menu aur Plan B alag se bhejenge.");
  return lines.join("\n");
}

// ------------------------------------------------------------- replies

export type CookIntent =
  | { intent: "ok" }
  | { intent: "plan_b" }
  | { intent: "missing"; ingredientIds: string[]; raw: string }
  | { intent: "unknown" };

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** Keyword parser for the cook's short replies ("OK", "paneer khatam", "Plan B"). */
export function parseCookReply(text: string, data: Pick<PlannerData, "ingredients">): CookIntent {
  const t = norm(text);
  if (!t) return { intent: "unknown" };
  const missingRe = /\b(khatam|khatm|khtm|khalas|nahi hai|nahin hai|nai hai|nahi he|missing|finish|finished|over|nahi mila)\b/;
  if (missingRe.test(t)) {
    const rest = ` ${t.replace(missingRe, " ")} `;
    const ids: string[] = [];
    for (const ing of Object.values(data.ingredients)) {
      const names = [ing.nameEn, ...ing.nameCook.split("/")].map(norm).filter((n) => n.length >= 3);
      if (names.some((n) => rest.includes(` ${n} `) || rest.includes(` ${n}`))) ids.push(ing.id);
    }
    // prefer the most specific match ("green chilli" over "chilli")
    return { intent: "missing", ingredientIds: ids, raw: text };
  }
  if (/\bplan ?b\b/.test(t)) return { intent: "plan_b" };
  if (/^(ok|okay|okk+|k|theek|thik|thik hai|theek hai|haan|ha|ji|done|accha|achha|hmm)\b/.test(t) || /👍/.test(text))
    return { intent: "ok" };
  return { intent: "unknown" };
}

// ------------------------------------------------------------- links

export function waNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}

/** wa.me deep link with the message prefilled (works on iPhone and Android). */
export function waLink(phone: string, text: string) {
  const n = waNumber(phone);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
