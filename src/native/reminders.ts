// Local notifications. Each reminder is a one-off alarm for the next 28 days
// (exact + allowed while the phone is idle when exact alarms are permitted). They are
// re-armed by the plugin after a phone restart, and rescheduled here every time the app
// opens or settings change, so they keep going as long as the app is opened now and then.
import { LocalNotifications } from "@capacitor/local-notifications";
import { getMeta, setMeta } from "../data/db";
import { getSettings } from "../data/repo";
import { nowIST } from "../lib/core/dates";
import { isNative } from "./device";
import { reminderText, upcomingReminders } from "./schedule";

const CHANNEL = "reminders";

export interface ReminderStatus {
  supported: boolean;
  permission: "granted" | "denied" | "prompt" | "unknown";
  exact: "granted" | "denied" | "unknown";
  scheduled: number;
  until: string | null;
  next: string | null;
}

export async function reminderStatus(): Promise<ReminderStatus> {
  if (!isNative()) return { supported: false, permission: "unknown", exact: "unknown", scheduled: 0, until: null, next: null };
  const perm = await LocalNotifications.checkPermissions();
  let exact: ReminderStatus["exact"] = "unknown";
  try {
    exact = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === "granted" ? "granted" : "denied";
  } catch {
    exact = "unknown";
  }
  const { notifications } = await LocalNotifications.getPending();
  const times = notifications.map((n) => (n.schedule?.at ? new Date(n.schedule.at).getTime() : 0)).filter(Boolean).sort();
  return {
    supported: true,
    permission: perm.display === "granted" ? "granted" : perm.display === "denied" ? "denied" : "prompt",
    exact,
    scheduled: notifications.length,
    until: times.length ? new Date(times[times.length - 1]).toISOString() : null,
    next: times.length ? new Date(times[0]).toISOString() : null,
  };
}

/** Android 13+: asks for notification permission (only shows the system dialog once). */
export async function askNotificationPermission() {
  if (!isNative()) return false;
  const r = await LocalNotifications.requestPermissions();
  return r.display === "granted";
}

/** Android 12+: opens the "Alarms & reminders" setting so reminders can be exact. */
export async function openExactAlarmSetting() {
  if (!isNative()) return;
  await LocalNotifications.changeExactNotificationSetting();
}

/** Cancel and re-create every reminder from the current settings. */
export async function rescheduleReminders(): Promise<ReminderStatus> {
  if (!isNative()) return reminderStatus();
  const s = await getSettings();
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  if (!s.remindersOn) return reminderStatus();
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") return reminderStatus();

  await LocalNotifications.createChannel({
    id: CHANNEL, name: "Reminders", description: "Menu, dinner, weekly plan and grocery reminders", importance: 5, visibility: 1, vibration: true,
  });
  let exactOk = true;
  try {
    exactOk = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === "granted";
  } catch {
    exactOk = true; // Android < 12: always exact
  }
  const occ = upcomingReminders(s, new Date(), nowIST().date);
  await LocalNotifications.schedule({
    notifications: occ.map((o) => {
      const t = reminderText(o.kind, s.cookName);
      return {
        id: o.id,
        title: t.title,
        body: t.body,
        channelId: CHANNEL,
        smallIcon: "ic_stat_notify",
        // Never let schedule() pop the system settings screen: exact only when already allowed.
        isExactNotification: exactOk,
        schedule: { at: o.at, allowWhileIdle: true },
        extra: { route: t.route, date: o.date },
        autoCancel: true,
      };
    }),
  });
  await setMeta("remindersScheduledAt", new Date().toISOString());
  return reminderStatus();
}

/** Tapping a notification opens the matching screen (also when the app was closed). */
export async function onReminderTap(go: (route: string) => void) {
  if (!isNative()) return;
  await LocalNotifications.addListener("localNotificationActionPerformed", (a) => {
    const route = (a.notification.extra as { route?: string } | undefined)?.route;
    if (route) go(route);
  });
}

export const lastScheduledAt = () => getMeta<string | null>("remindersScheduledAt", null);
