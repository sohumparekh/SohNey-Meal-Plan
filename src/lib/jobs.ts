// Scheduled jobs. A database cron calls /api/cron/tick every 15 minutes; each job runs
// once per day/week (claimed in job_runs) when its India-time slot has arrived, and
// is dropped if more than 3 hours late. Times are editable in Settings.
import "server-only";
import { addDays, dayOfWeek, minutesOf, nowIST, prettyDate, weekStartFor, type ISODate } from "./core/dates";
import { mealKey } from "./core/types";
import * as repo from "./db/repo";
import { notifyAll } from "./push";
import { ensureCurrentWeeks, ensureWeek, shoppingFor, snapshotFor, weekContext } from "./services";

const LATE_LIMIT_MIN = 180;

function due(now: ReturnType<typeof nowIST>, time: string, day?: number) {
  if (day !== undefined && dayOfWeek(now.date) !== day) return false;
  const diff = now.hour * 60 + now.minute - minutesOf(time);
  return diff >= 0 && diff <= LATE_LIMIT_MIN;
}

export async function runDueJobs(at: Date = new Date()) {
  const now = nowIST(at);
  const s = await repo.getSettings();
  const ran: string[] = [];
  const today = now.date;
  const nextWeek = addDays(weekStartFor(today), 7);

  await ensureCurrentWeeks(); // also keeps the free database from pausing

  // Thursday 8 pm: draft next week
  if (due(now, s.draftTime, s.draftDay) && (await repo.claimJob("weekly_draft", nextWeek))) {
    const { created } = await ensureWeek(nextWeek);
    const w = await repo.getWeek(nextWeek);
    if (w?.status === "draft")
      await notifyAll("Next week's menu is ready", `Week of ${prettyDate(nextWeek)}. Review and approve in 2 minutes.`, `/week?start=${nextWeek}`);
    ran.push(`weekly_draft${created ? "" : " (existing)"}`);
  }

  // Friday 9 am: nudge if not approved yet
  if (due(now, s.approveReminderTime, s.approveReminderDay) && (await repo.claimJob("approve_reminder", nextWeek))) {
    await ensureWeek(nextWeek);
    const w = await repo.getWeek(nextWeek);
    if (w?.status === "draft") {
      await notifyAll("Approve next week's menu", "Approve it so the Shubham list is ready for today's pickup.", `/week?start=${nextWeek}`);
      ran.push("approve_reminder");
    }
  }

  // Every night: remind us to send tomorrow's menu (Phase 1), mark today's meals cooked
  if (due(now, s.nightlyTime) && (await repo.claimJob("nightly", today))) {
    const tomorrow = addDays(today, 1);
    await ensureWeek(weekStartFor(tomorrow));
    await repo.markCooked(today);
    await notifyAll(`Send tomorrow's menu to ${s.cookName}`, "One tap: it opens WhatsApp with the message ready.", `/send?evening=${today}`);
    ran.push("nightly");
  }

  // 4 pm: only if tonight's dinner changed after the cook was told
  if (due(now, s.dinnerCheckTime) && (await repo.claimJob("dinner_check", today))) {
    const last = await repo.lastSentFor(["daily", "dinner_change", "eating_out"], today);
    const { meals, data } = await weekContext(weekStartFor(today));
    const snap = snapshotFor(meals, today);
    if (last?.snapshot && last.snapshot.dinner !== snap.dinner) {
      const m = meals[mealKey(today, "dinner")];
      const name = m?.status === "skipped" ? "no dinner (eating out)" : data.dishes[m?.dishId ?? ""]?.nameEn;
      await notifyAll(`Tonight's dinner changed: tell ${s.cookName}`, `Now: ${name}. Tap to send the update.`, `/send?kind=dinner&date=${today}`);
      ran.push("dinner_check");
    }
  }

  // Tuesday 10 am: top-up needed?
  if (s.topupEnabled && due(now, s.topupCheckTime, s.topupCheckDay) && (await repo.claimJob("topup_check", today))) {
    const { lists } = await shoppingFor(weekStartFor(today));
    const open = lists.topup.filter((i) => !i.ticked);
    if (open.length) {
      await notifyAll("Top-up needed today", open.map((i) => i.nameEn).slice(0, 6).join(", "), "/shopping?list=topup");
      ran.push("topup_check");
    }
  }

  if (await repo.claimJob("prune", today)) await repo.pruneOld(today);
  return { now: `${now.date} ${now.hhmm}`, ran };
}

export const _test = { due };
export type { ISODate };
