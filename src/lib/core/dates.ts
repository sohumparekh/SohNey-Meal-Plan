// Date helpers. Every date in the app is a plain "YYYY-MM-DD" string in Asia/Kolkata.
// Using strings (not Date objects) avoids timezone drift between the server (UTC on
// Vercel) and the phones.

export const TZ = "Asia/Kolkata";

export type ISODate = string;

/** Current wall-clock time in India. */
export function nowIST(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return { date, hour, minute, hhmm: `${get("hour")}:${get("minute")}` };
}

export const todayIST = (now?: Date) => nowIST(now).date;

function toUTC(d: ISODate) {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

export function addDays(d: ISODate, n: number): ISODate {
  return new Date(toUTC(d) + n * 86400000).toISOString().slice(0, 10);
}

export function daysBetween(a: ISODate, b: ISODate) {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000);
}

/** 0 = Sunday ... 6 = Saturday */
export function dayOfWeek(d: ISODate) {
  return new Date(toUTC(d)).getUTCDay();
}

/** Planning weeks run Saturday to Friday. */
export function weekStartFor(d: ISODate): ISODate {
  const dow = dayOfWeek(d); // Sat=6
  const back = (dow + 1) % 7; // Sat->0, Sun->1, ... Fri->6
  return addDays(d, -back);
}

/** 1 (Sat) .. 7 (Fri) = days since the Friday-evening delivery. */
export function dayInWeek(d: ISODate) {
  return daysBetween(weekStartFor(d), d) + 1;
}

export const isWeekendDate = (d: ISODate) => [0, 6].includes(dayOfWeek(d));

export function weekDates(weekStart: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EN_DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HI_DAYS = ["Ravivar", "Somvar", "Mangalvar", "Budhvar", "Guruvar", "Shukravar", "Shanivar"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const dayNameEn = (d: ISODate) => EN_DAYS[dayOfWeek(d)];
export const dayNameEnLong = (d: ISODate) => EN_DAYS_LONG[dayOfWeek(d)];
export const dayNameHi = (d: ISODate) => HI_DAYS[dayOfWeek(d)];
export function shortDate(d: ISODate) {
  const [, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1]}`;
}
export const prettyDate = (d: ISODate) => `${dayNameEn(d)} ${shortDate(d)}`;

/** Minutes since midnight for "HH:MM". */
export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
