// Reminder times, computed in India time (Asia/Kolkata, UTC+5:30, no daylight saving)
// as absolute instants, so they are right even if the phone's clock zone differs.
// Pure functions: unit tested.
import { addDays, dayOfWeek, minutesOf, type ISODate } from "../lib/core/dates";
import type { Settings } from "../lib/core/types";

export type ReminderKind = "dailyMenu" | "dinnerCheck" | "planWeek" | "groceryOrder";

export interface Occurrence {
  id: number;
  kind: ReminderKind;
  at: Date;
  date: ISODate;
}

const IST_OFFSET_MIN = 330;
export const HORIZON_DAYS = 28;
const BASE_ID: Record<ReminderKind, number> = { dailyMenu: 1000, dinnerCheck: 2000, planWeek: 3000, groceryOrder: 4000 };

/** The instant at which it is `hhmm` on `date` in India. */
export function istInstant(date: ISODate, hhmm: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + (minutesOf(hhmm) - IST_OFFSET_MIN) * 60000);
}

/** All reminder instants from `now` for the next HORIZON_DAYS days. */
export function upcomingReminders(s: Settings, now: Date, todayIst: ISODate): Occurrence[] {
  const out: Occurrence[] = [];
  for (let i = 0; i <= HORIZON_DAYS; i++) {
    const date = addDays(todayIst, i);
    const dow = dayOfWeek(date);
    const add = (kind: ReminderKind, time: string) => {
      const at = istInstant(date, time);
      if (at.getTime() > now.getTime() + 30_000) out.push({ id: BASE_ID[kind] + i, kind, at, date });
    };
    add("dailyMenu", s.dailyMenuTime);
    add("dinnerCheck", s.dinnerCheckTime);
    if (dow === s.planWeekDay) add("planWeek", s.planWeekTime);
    if (dow === s.groceryDay) add("groceryOrder", s.groceryTime);
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function reminderText(kind: ReminderKind, cookName: string) {
  switch (kind) {
    case "dailyMenu": return { title: `Send tomorrow's menu to ${cookName}`, body: "Tap, then tap Send on WhatsApp.", route: "/send/daily" };
    case "dinnerCheck": return { title: "Check tonight's dinner", body: `Changed anything? Tell ${cookName} in one tap.`, route: "/send/dinner" };
    case "planWeek": return { title: "Plan next week", body: "Review the menu and approve. About 2 minutes.", route: "/week?start=next" };
    case "groceryOrder": return { title: "Send grocery order", body: "The list for the office grocer is ready.", route: "/send/grocer" };
  }
}
