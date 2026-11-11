// Messages for the cook in the language chosen in Settings: Hinglish (Hindi in English
// letters, default), Hindi (Devanagari) or English. Also the grocer order and wa.me links.
import { DISH_NAME_HI, PREP_HI } from "../seed/hindi";
import { addDays, dayOfWeek, weekDates, type ISODate } from "./dates";
import { SLOTS, mealKey, type CookLanguage, type Dish, type Meal, type PlannerData, type Slot } from "./types";

type When = "tonight" | "tomorrowMorning" | "tomorrowAfternoon" | "tomorrowEvening";

interface Strings {
  days: string[];
  months: string[];
  hello: (cook: string) => string;
  tomorrowFood: (dayLabel: string, people: number) => string;
  slot: Record<Slot, string>;
  slotFor: Record<Slot, string>;
  people: (n: number) => string;
  planB: string;
  notPlanned: string;
  eatingOut: string;
  newDish: string;
  when: Record<When, string>;
  prepFor: (whenLabel: string, slotFor: string, dish: string) => string;
  tomorrowWord: string;
  footer: string;
  dinnerChanged: (cook: string) => string;
  noDinner: (cook: string) => string;
  eatingOutMsg: (cook: string, dayLabel: string, slot: string) => string;
  movedTo: (dish: string, dayLabel: string, slot: string) => string;
  weekTitle: (dayLabel: string) => string;
  weekOut: string;
  weekFooter: string;
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const T: Record<CookLanguage, Strings> = {
  hinglish: {
    days: ["Ravivar", "Somvar", "Mangalvar", "Budhvar", "Guruvar", "Shukravar", "Shanivar"],
    months: MONTHS_EN,
    hello: (c) => `Namaste ${c} ji 🙏`,
    tomorrowFood: (d, n) => `Kal ${d} ka khana (${n} log):`,
    slot: { breakfast: "Nashta", lunch: "Dopahar", dinner: "Raat" },
    slotFor: { breakfast: "nashte", lunch: "dopahar ke khane", dinner: "raat ke khane" },
    people: (n) => `(${n} log)`,
    planB: "Plan B",
    notPlanned: "(abhi tay nahi)",
    eatingOut: "Nahi banana, hum bahar kha rahe hain",
    newDish: "Nayi dish, tarika:",
    when: { tonight: "Aaj raat", tomorrowMorning: "Kal subah", tomorrowAfternoon: "Kal dopahar", tomorrowEvening: "Kal shaam" },
    prepFor: (w, s, d) => `(${w} ${s}, ${d} ke liye)`,
    tomorrowWord: "kal",
    footer: `Koi saamaan khatam ho to Plan B bana lena aur bas "<saamaan> khatam" likh dena. Sab theek ho to "OK" bhej dena.`,
    dinnerChanged: (c) => `${c} ji, aaj raat ka khana badal gaya hai 🙏`,
    noDinner: (c) => `${c} ji, aaj raat hum bahar kha rahe hain. Dinner mat banana 🙏`,
    eatingOutMsg: (c, d, s) => `${c} ji, ${d} ${s} hum bahar kha rahe hain, khana mat banana 🙏`,
    movedTo: (dish, d, s) => `${dish} ab ${d} ${s} ko banana hai.`,
    weekTitle: (d) => `Is hafte ka menu (${d} se):`,
    weekOut: "bahar",
    weekFooter: "Har raat kal ka menu aur Plan B alag se bhejenge.",
  },
  hindi: {
    days: ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
    months: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
    hello: (c) => `नमस्ते ${c} जी 🙏`,
    tomorrowFood: (d, n) => `कल ${d} का खाना (${n} लोग):`,
    slot: { breakfast: "नाश्ता", lunch: "दोपहर", dinner: "रात" },
    slotFor: { breakfast: "नाश्ते", lunch: "दोपहर के खाने", dinner: "रात के खाने" },
    people: (n) => `(${n} लोग)`,
    planB: "Plan B",
    notPlanned: "(अभी तय नहीं)",
    eatingOut: "नहीं बनाना, हम बाहर खा रहे हैं",
    newDish: "नई डिश, तरीका:",
    when: { tonight: "आज रात", tomorrowMorning: "कल सुबह", tomorrowAfternoon: "कल दोपहर", tomorrowEvening: "कल शाम" },
    prepFor: (w, s, d) => `(${w} ${s}, ${d} के लिए)`,
    tomorrowWord: "कल",
    footer: `कोई सामान ख़त्म हो तो Plan B बना लेना और बस "<सामान> ख़त्म" लिख देना। सब ठीक हो तो "OK" भेज देना।`,
    dinnerChanged: (c) => `${c} जी, आज रात का खाना बदल गया है 🙏`,
    noDinner: (c) => `${c} जी, आज रात हम बाहर खा रहे हैं। डिनर मत बनाना 🙏`,
    eatingOutMsg: (c, d, s) => `${c} जी, ${d} ${s} हम बाहर खा रहे हैं, खाना मत बनाना 🙏`,
    movedTo: (dish, d, s) => `${dish} अब ${d} ${s} को बनाना है।`,
    weekTitle: (d) => `इस हफ़्ते का मेनू (${d} से):`,
    weekOut: "बाहर",
    weekFooter: "हर रात कल का मेनू और Plan B अलग से भेजेंगे।",
  },
  english: {
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    months: MONTHS_EN,
    hello: (c) => `Hello ${c} 🙏`,
    tomorrowFood: (d, n) => `Tomorrow, ${d} (${n} people):`,
    slot: { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" },
    slotFor: { breakfast: "breakfast", lunch: "lunch", dinner: "dinner" },
    people: (n) => `(${n} people)`,
    planB: "Plan B",
    notPlanned: "(not decided yet)",
    eatingOut: "No cooking, we are eating out",
    newDish: "New dish, how to make:",
    when: { tonight: "Tonight", tomorrowMorning: "Tomorrow morning", tomorrowAfternoon: "Tomorrow afternoon", tomorrowEvening: "Tomorrow evening" },
    prepFor: (w, s, d) => `(for ${w}'s ${s}, ${d})`,
    tomorrowWord: "tomorrow",
    footer: `If anything has run out, make Plan B and just send "<item> finished". If all is fine, send "OK".`,
    dinnerChanged: (c) => `${c}, tonight's dinner has changed 🙏`,
    noDinner: (c) => `${c}, we are eating out tonight. No dinner needed 🙏`,
    eatingOutMsg: (c, d, s) => `${c}, we are eating out on ${d} (${s}), no need to cook 🙏`,
    movedTo: (dish, d, s) => `${dish} is now on ${d}, ${s}.`,
    weekTitle: (d) => `This week's menu (from ${d}):`,
    weekOut: "eating out",
    weekFooter: "We will send tomorrow's menu and Plan B every night.",
  },
};

const lang = (data: PlannerData): CookLanguage => data.settings.cookLanguage ?? "hinglish";

export function dayLabel(d: ISODate, l: CookLanguage) {
  const [, m, day] = d.split("-").map(Number);
  return `${T[l].days[dayOfWeek(d)]} ${day} ${T[l].months[m - 1]}`;
}
const dayName = (d: ISODate, l: CookLanguage) => T[l].days[dayOfWeek(d)];

/** The dish name the cook should see, in the chosen language. */
export function cookName(dish: Dish, l: CookLanguage) {
  if (l === "english") return dish.nameEn.replace(/ \+ /g, ", ");
  if (l === "hindi") return dish.nameCookHi ?? DISH_NAME_HI[dish.id] ?? dish.nameCook;
  return dish.nameCook;
}
function prepText(dish: Dish, l: CookLanguage) {
  if (!dish.prepAhead) return "";
  if (l === "english") return dish.prepAhead.en;
  if (l === "hindi") return PREP_HI[dish.id] ?? dish.prepAhead.cook;
  return dish.prepAhead.cook;
}

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
  when: When;
}

/**
 * Prep jobs for the message sent on the evening of `evening`. A task starts `leadHours`
 * before the meal; starts between 10 pm and 7 am move to the previous night at 9:30 pm.
 * The message covers tasks starting from that evening until the next evening.
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
        const day = h >= 22 ? start.toISOString().slice(0, 10) : addDays(start.toISOString().slice(0, 10), -1);
        start = new Date(`${day}T21:30:00Z`);
      }
      const t = start.getTime();
      if (t < windowStart || t >= windowEnd) continue;
      const sameEvening = start.toISOString().slice(0, 10) === evening;
      const sh = start.getUTCHours();
      const when: When = sameEvening ? "tonight" : sh < 12 ? "tomorrowMorning" : sh < 17 ? "tomorrowAfternoon" : "tomorrowEvening";
      tasks.push({ forDate: d, forSlot: slot, dishId: dish.id, when });
    }
  }
  return tasks;
}

function mealLines(data: PlannerData, meal: Meal | undefined, slot: Slot, l: CookLanguage) {
  const s = T[l];
  const icon = { breakfast: "☀️", lunch: "🍛", dinner: "🌙" }[slot];
  if (!meal) return [`${icon} ${s.slot[slot]}: ${s.notPlanned}`];
  if (meal.status === "skipped") return [`${icon} ${s.slot[slot]}: ${s.eatingOut}`];
  const dish = effectiveDish(data, meal);
  if (!dish) return [`${icon} ${s.slot[slot]}: ?`];
  const servings = meal.servings !== data.settings.servingsDefault ? ` ${s.people(meal.servings)}` : "";
  const lines = [`${icon} ${s.slot[slot]}: ${cookName(dish, l)}${servings}`];
  if (!meal.planB) {
    const pb = data.dishes[dish.planBId];
    if (pb) lines.push(`    ${s.planB}: ${cookName(pb, l)}`);
  }
  if (dish.recipeCook && !dish.lastCookedAt) {
    lines.push(`    ${s.newDish}`);
    for (const r of dish.recipeCook.split("\n").filter(Boolean)) lines.push(`    ${r.trim()}`);
  }
  return lines;
}

/** The nightly message: tomorrow's three meals with Plan Bs and tonight's prep. */
export function dailyMessage(data: PlannerData, meals: Record<string, Meal>, evening: ISODate) {
  const l = lang(data), s = T[l];
  const d = addDays(evening, 1);
  const lines = [s.hello(data.settings.cookName), s.tomorrowFood(dayLabel(d, l), data.settings.servingsDefault), ""];
  for (const slot of SLOTS) lines.push(...mealLines(data, meals[mealKey(d, slot)], slot, l));
  const prep = prepTasksForEvening(data, meals, evening);
  if (prep.length) {
    lines.push("");
    for (const p of prep) {
      const dish = data.dishes[p.dishId];
      const forWhen = p.forDate === d ? s.tomorrowWord : dayName(p.forDate, l);
      lines.push(`📌 ${s.when[p.when]}: ${prepText(dish, l)} ${s.prepFor(forWhen, s.slotFor[p.forSlot], cookName(dish, l))}`);
    }
  }
  lines.push("", s.footer);
  return lines.join("\n");
}

/** Tonight's dinner, sent when it changed during the day. */
export function dinnerChangeMessage(data: PlannerData, meal: Meal) {
  const l = lang(data), s = T[l], cook = data.settings.cookName;
  if (meal.status === "skipped") return s.noDinner(cook);
  const dish = effectiveDish(data, meal);
  const pb = dish && !meal.planB ? data.dishes[dish.planBId] : undefined;
  return [
    s.dinnerChanged(cook),
    `🌙 ${s.slot.dinner}: ${dish ? cookName(dish, l) : "?"}`,
    ...(pb ? [`    ${s.planB}: ${cookName(pb, l)}`] : []),
  ].join("\n");
}

export function eatingOutMessage(data: PlannerData, meal: Meal, movedTo?: Meal) {
  const l = lang(data), s = T[l];
  const lines = [s.eatingOutMsg(data.settings.cookName, dayLabel(meal.date, l), s.slot[meal.slot])];
  if (movedTo) lines.push(s.movedTo(cookName(data.dishes[movedTo.dishId], l), dayLabel(movedTo.date, l), s.slot[movedTo.slot]));
  return lines.join("\n");
}

/** One message with the whole week, sent once before the week starts. */
export function weekOverviewMessage(data: PlannerData, meals: Record<string, Meal>, weekStart: ISODate) {
  const l = lang(data), s = T[l];
  const lines = [s.hello(data.settings.cookName), s.weekTitle(dayLabel(weekStart, l)), ""];
  for (const d of weekDates(weekStart)) {
    lines.push(`*${dayName(d, l)}*`);
    for (const slot of SLOTS) {
      const m = meals[mealKey(d, slot)];
      const dish = m ? effectiveDish(data, m) : undefined;
      const txt = !m ? "-" : m.status === "skipped" ? s.weekOut : dish ? cookName(dish, l) : "?";
      lines.push(`  ${s.slot[slot]}: ${txt}`);
    }
  }
  lines.push("", s.weekFooter);
  return lines.join("\n");
}

// ------------------------------------------------------------- replies

export type CookIntent =
  | { intent: "ok" }
  | { intent: "plan_b" }
  | { intent: "missing"; ingredientIds: string[]; raw: string }
  | { intent: "unknown" };

const norm = (s: string) => s.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** Keyword parser for the cook's short replies ("OK", "paneer khatam", "Plan B"). */
export function parseCookReply(text: string, data: Pick<PlannerData, "ingredients">): CookIntent {
  const t = norm(text);
  if (!t) return { intent: "unknown" };
  const missingRe = /(khatam|khatm|khtm|khalas|nahi hai|nahin hai|nai hai|nahi he|missing|finished|finish|nahi mila|ख़त्म|खत्म|नहीं है)/;
  if (missingRe.test(t)) {
    const rest = ` ${t.replace(missingRe, " ")} `;
    const ids: string[] = [];
    for (const ing of Object.values(data.ingredients)) {
      const names = [ing.nameEn, ...ing.nameCook.split("/")].map(norm).filter((n) => n.length >= 3);
      if (names.some((n) => rest.includes(` ${n} `) || rest.includes(` ${n}`))) ids.push(ing.id);
    }
    return { intent: "missing", ingredientIds: ids, raw: text };
  }
  if (/\bplan ?b\b/.test(t)) return { intent: "plan_b" };
  if (/^(ok|okay|okk+|k|theek|thik|haan|ha|ji|done|accha|achha|hmm|ठीक|हाँ|हां)/.test(t) || /👍/.test(text)) return { intent: "ok" };
  return { intent: "unknown" };
}

// ------------------------------------------------------------- links

export function waNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}

/** wa.me link with the message prefilled; opens the WhatsApp chat on Android. */
export function waLink(phone: string, text: string) {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
}
