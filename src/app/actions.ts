"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COOKIE, MAX_AGE, makeToken, passcodeMatches } from "@/lib/auth";
import { addDays, todayIST, weekStartFor, type ISODate } from "@/lib/core/dates";
import { dinnerChangeMessage, eatingOutMessage, parseCookReply, waLink } from "@/lib/core/cookMessages";
import { mealKey, type Dish, type Ingredient, type Settings, type Slot } from "@/lib/core/types";
import * as repo from "@/lib/db/repo";
import { sql } from "@/lib/db/client";
import { draftDish, readCookReply, readLink } from "@/lib/ai";
import { ensureWeek, reportMissing, snapshotFor, suggestionsFor, swapMeal, toggleEatingOut, weekContext } from "@/lib/services";

const refresh = () => revalidatePath("/", "layout");

// ---------------------------------------------------------------- auth

export async function loginAction(_: unknown, form: FormData) {
  if (!passcodeMatches(String(form.get("passcode") ?? ""))) return { error: "That passcode is not right." };
  (await cookies()).set(COOKIE, await makeToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: MAX_AGE, path: "/" });
  const next = String(form.get("next") || "/");
  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutAction() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

// ---------------------------------------------------------------- meals

export async function getSuggestionsAction(date: ISODate, slot: Slot) {
  const { data, suggestions } = await suggestionsFor(date, slot);
  return suggestions.map((s) => {
    const d = data.dishes[s.dishId];
    return { id: d.id, nameEn: d.nameEn, nameCook: d.nameCook, cuisine: d.cuisine, effort: d.effort, reason: s.reason };
  });
}

export async function swapAction(date: ISODate, slot: Slot, dishId: string) {
  await swapMeal(date, slot, dishId);
  refresh();
}

export async function eatingOutAction(date: ISODate, slot: Slot) {
  const r = await toggleEatingOut(date, slot);
  refresh();
  if (r.undone) return { undone: true as const };
  const s = r.data.settings;
  const text = eatingOutMessage(r.data, r.meal, r.moved?.to);
  return {
    undone: false as const,
    text,
    link: waLink(s.cookPhone, text),
    moved: r.moved ? { date: r.moved.to.date, slot: r.moved.to.slot, dish: r.data.dishes[r.moved.to.dishId].nameEn } : null,
    stranded: (r.stranded ?? []).map((id) => r.data.ingredients[id]?.nameEn ?? id),
  };
}

export async function servingsAction(date: ISODate, slot: Slot, servings: number) {
  const { meals } = await weekContext(weekStartFor(date));
  const m = meals[mealKey(date, slot)];
  if (!m) return;
  await repo.updateMeal({ ...m, servings: Math.max(1, Math.min(12, servings)) });
  refresh();
}

export async function planBAction(date: ISODate, slot: Slot, on: boolean) {
  const { meals } = await weekContext(weekStartFor(date));
  const m = meals[mealKey(date, slot)];
  if (!m) return;
  await repo.updateMeal({ ...m, planB: on });
  refresh();
}

export async function rateAction(dishId: string, delta: 1 | -1) {
  await repo.rateDish(dishId, delta);
  refresh();
}

// ---------------------------------------------------------------- weeks

export async function approveWeekAction(weekStart: ISODate) {
  await ensureWeek(weekStart);
  await repo.setWeekStatus(weekStart, "approved");
  refresh();
}

/** Throw away a draft (not yet approved) and draft it again from the rotation. */
export async function redraftWeekAction(weekStart: ISODate) {
  const w = await repo.getWeek(weekStart);
  if (w?.status === "approved" && weekStart <= todayIST()) throw new Error("This week has started");
  await sql()`delete from meals where date between ${weekStart} and ${addDays(weekStart, 6)}`;
  await sql()`delete from weeks where week_start = ${weekStart}`;
  await ensureWeek(weekStart);
  refresh();
}

// ---------------------------------------------------------------- shopping

export async function tickAction(weekStart: ISODate, list: string, ingredientId: string, ticked: boolean) {
  await repo.setTick(weekStart, list, ingredientId, ticked);
  if (ticked && (list === "staples" || list === "grocer" || list === "blinkit")) {
    const data = await repo.getPlannerData();
    if (data.ingredients[ingredientId]?.category === "staple") await repo.markStapleBought(ingredientId, todayIST());
  }
  if (ticked && list === "topup") await repo.resolveMissing(ingredientId);
  refresh();
}

export async function pickupDoneAction(weekStart: ISODate, done: boolean) {
  await repo.setPickupDone(weekStart, done);
  refresh();
}

export async function stapleLowAction(ingredientId: string, low: boolean) {
  await repo.reportStapleLow(ingredientId, low);
  refresh();
}

// ---------------------------------------------------------------- cook messages

export async function logSentAction(kind: string, forDate: ISODate, text: string) {
  const ws = weekStartFor(forDate);
  const { meals } = await weekContext(ws);
  await repo.logCookMessage({ direction: "out", kind, forDate, text, snapshot: snapshotFor(meals, forDate) });
  refresh();
}

export async function dinnerChangeTextAction(date: ISODate) {
  const { data, meals } = await weekContext(weekStartFor(date));
  const m = meals[mealKey(date, "dinner")];
  if (!m) return null;
  const text = dinnerChangeMessage(data, m);
  return { text, link: waLink(data.settings.cookPhone, text) };
}

/** Neyomi pastes (or types) what the cook replied. Keyword parsing first, Claude only for free text. */
export async function cookReplyAction(text: string) {
  const data = await repo.getPlannerData();
  let parsed = parseCookReply(text, data);
  let summary = "";
  if (parsed.intent === "unknown" || (parsed.intent === "missing" && parsed.ingredientIds.length === 0)) {
    try {
      const ai = await readCookReply(text, data.ingredients);
      if (ai) {
        summary = ai.summaryEn;
        parsed = ai.intent === "missing" ? { intent: "missing", ingredientIds: ai.missingIngredientIds, raw: text }
          : ai.intent === "ok" ? { intent: "ok" } : ai.intent === "plan_b" ? { intent: "plan_b" } : { intent: "unknown" };
      }
    } catch (e) {
      summary = `Could not read it automatically (${(e as Error).message}).`;
    }
  }
  await repo.logCookMessage({ direction: "in", kind: "reply", forDate: todayIST(), text, parsedIntent: parsed });
  if (parsed.intent === "missing" && parsed.ingredientIds.length) {
    const switched = await reportMissing(data, parsed.ingredientIds);
    refresh();
    const names = parsed.ingredientIds.map((id) => data.ingredients[id].nameEn).join(", ");
    return {
      intent: "missing",
      message: `${names} added to the top-up list.` + (switched.length ? ` Switched to Plan B: ${switched.map((m) => data.dishes[m.dishId].nameEn).join(", ")}.` : " No meal in the next 2 days needs it."),
    };
  }
  refresh();
  if (parsed.intent === "ok") return { intent: "ok", message: "She confirmed. Nothing to do." };
  if (parsed.intent === "plan_b") return { intent: "plan_b", message: "She is making Plan B. Tell us which item ran out to add it to the top-up." };
  return { intent: "unknown", message: summary || "Could not tell what she means. Use the buttons on the meal instead." };
}

export async function reportMissingAction(ingredientIds: string[]) {
  const data = await repo.getPlannerData();
  await reportMissing(data, ingredientIds);
  refresh();
}

// ---------------------------------------------------------------- settings

export async function saveSettingsAction(_: unknown, form: FormData) {
  const str = (k: string) => String(form.get(k) ?? "").trim();
  const num = (k: string, d: number) => (Number.isFinite(Number(form.get(k))) && str(k) !== "" ? Number(form.get(k)) : d);
  const cur = await repo.getSettings();
  const time = (k: string, d: string) => (/^\d{2}:\d{2}$/.test(str(k)) ? str(k) : d);
  const patch: Partial<Settings> = {
    householdName: str("householdName") || cur.householdName,
    cookName: str("cookName") || cur.cookName,
    cookPhone: str("cookPhone"),
    grocerName: str("grocerName") || cur.grocerName,
    grocerPhone: str("grocerPhone"),
    servingsDefault: num("servingsDefault", cur.servingsDefault),
    noRepeatDays: num("noRepeatDays", cur.noRepeatDays),
    topupEnabled: form.get("topupEnabled") === "on",
    eitherGoesTo: str("eitherGoesTo") === "grocer" ? "grocer" : "blinkit",
    blinkitLinks: form.get("blinkitLinks") === "on",
    draftDay: num("draftDay", cur.draftDay),
    draftTime: time("draftTime", cur.draftTime),
    approveReminderTime: time("approveReminderTime", cur.approveReminderTime),
    nightlyTime: time("nightlyTime", cur.nightlyTime),
    dinnerCheckTime: time("dinnerCheckTime", cur.dinnerCheckTime),
    topupCheckDay: num("topupCheckDay", cur.topupCheckDay),
    topupCheckTime: time("topupCheckTime", cur.topupCheckTime),
  };
  await repo.saveSettings(patch);
  refresh();
  return { saved: true };
}

// ---------------------------------------------------------------- dishes

export async function draftDishAction(input: string) {
  const data = await repo.getPlannerData();
  const trimmed = input.trim();
  const isUrl = /^https?:\/\//i.test(trimmed);
  let link;
  if (isUrl) {
    link = await readLink(trimmed);
    if (!link.ok) return { needName: true as const, error: "Could not read that link. Type the dish name instead." };
  }
  try {
    const out = await draftDish(isUrl ? { url: trimmed, link } : { name: trimmed }, data);
    const planB = data.dishes[out.dish.planBId];
    return { needName: false as const, ...out, planBName: planB?.nameEn ?? "", ingredientNames: Object.fromEntries([...Object.values(data.ingredients), ...out.newIngredients].map((i) => [i.id, `${i.nameEn} (${i.unit})`])), sourceUrl: isUrl ? trimmed : null };
  } catch (e) {
    return { needName: false as const, error: (e as Error).message };
  }
}

export async function saveDishAction(dish: Dish, newIngredients: Ingredient[], sourceUrl: string | null) {
  for (const i of newIngredients) await repo.upsertIngredient(i);
  await repo.upsertDish({ ...dish, sourceUrl });
  refresh();
  redirect(`/dishes/${dish.id}`);
}

export async function setDishActiveAction(id: string, active: boolean) {
  await repo.setDishActive(id, active);
  refresh();
}
