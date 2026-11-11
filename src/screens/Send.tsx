import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { SendToCook } from "@/components/SendToCook";
import { Banner } from "@/components/ui";
import { approveWeek, ensureWeek, getMealsMap, getPlannerData, lastSentFor, shoppingFor } from "@/data/repo";
import { dailyMessage, dinnerChangeMessage, waLink } from "@/lib/core/cookMessages";
import { addDays, dayOfWeek, nowIST, prettyDate, weekStartFor, type ISODate } from "@/lib/core/dates";
import { grocerOrderText } from "@/lib/core/shopping";
import { mealKey } from "@/lib/core/types";
import { currentEvening, sentLabel, useLive } from "./view";

/**
 * Opened from the reminders: the message, ready, with one big "Send on WhatsApp" button.
 *   /send/daily   tomorrow's menu for the cook (9 pm)
 *   /send/dinner  tonight's dinner for the cook (4 pm)
 *   /send/grocer  the grocer order (Friday)
 */
export function SendScreen() {
  const { kind = "daily" } = useParams();
  const [sp] = useSearchParams();
  const evening = currentEvening();
  const today = nowIST().date;
  const grocerWeek = grocerWeekFor(today, sp.get("week"));

  useEffect(() => {
    ensureWeek(weekStartFor(addDays(evening, 1)), { approve: true });
    if (kind === "grocer") ensureWeek(grocerWeek);
  }, [evening, kind, grocerWeek]);

  const v = useLive(async () => {
    const data = await getPlannerData();
    if (kind === "grocer") {
      const target = grocerWeek;
      const { lists, week } = await shoppingFor(target);
      const text = grocerOrderText(lists.grocer.filter((i) => !i.ticked), data.settings);
      return { data, text, week, target, phone: data.settings.grocerPhone, forDate: target, last: await lastSentFor(["grocer"], target) };
    }
    const meals = await getMealsMap(addDays(evening, -1), addDays(evening, 4));
    if (kind === "dinner") {
      const m = meals[mealKey(today, "dinner")];
      const text = m ? dinnerChangeMessage(data, m) : "";
      return { data, text, phone: data.settings.cookPhone, forDate: today, last: await lastSentFor(["daily", "dinner_change"], today), week: null, target: null };
    }
    const forDate = addDays(evening, 1);
    return { data, text: dailyMessage(data, meals, evening), phone: data.settings.cookPhone, forDate, last: await lastSentFor(["daily"], forDate), week: null, target: null };
  }, [kind, evening, today, grocerWeek]);
  if (!v) return null;

  const s = v.data.settings;
  const title =
    kind === "grocer" ? `Order for ${s.grocerName}` : kind === "dinner" ? "Tonight's dinner" : `Menu for ${prettyDate(addDays(evening, 1))}`;
  const label = kind === "grocer" ? `Send order to ${s.grocerName.split(" ")[0]}` : `Send to ${s.cookName}`;
  const sentKind = kind === "grocer" ? "grocer" : kind === "dinner" ? "dinner_change" : "daily";

  return (
    <div className="space-y-4 pb-6">
      <header>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted">
          {kind === "dinner" ? "If dinner changed today, send this. Otherwise nothing to do." : "Check it, then send."}
        </p>
      </header>
      {kind === "grocer" && v.week?.status === "draft" && v.target && (
        <Banner>
          Next week isn&apos;t approved yet. <button className="font-semibold underline" onClick={() => approveWeek(v.target!)}>Approve as it is</button> or{" "}
          <Link className="underline" to={`/week?start=${v.target}`}>review it first</Link>.
        </Banner>
      )}
      {(kind !== "dinner" || v.text) && (
        <SendToCook label={label} text={v.text} link={waLink(v.phone, v.text)} kind={sentKind} forDate={v.forDate} sentAt={sentLabel(v.last?.createdAt)} showPreview />
      )}
      {!v.phone && (
        <p className="text-sm text-muted">
          No number saved, so WhatsApp will ask who to send it to. Add it in <Link className="underline" to="/settings">Settings</Link>.
        </p>
      )}
      <Link to="/" className="block text-center text-sm text-muted underline">Change something first</Link>
    </div>
  );
}

/** The grocer order is for the coming week from Thursday on (Friday is pickup day). */
function grocerWeekFor(today: ISODate, param: string | null): ISODate {
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) return weekStartFor(param);
  const ws = weekStartFor(today);
  return [4, 5].includes(dayOfWeek(today)) ? addDays(ws, 7) : ws;
}
