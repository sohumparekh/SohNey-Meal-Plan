import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { SendToCook } from "@/components/SendToCook";
import { Banner, PageTitle } from "@/components/ui";
import { motion } from "motion/react";
import { Stagger, rise } from "@/ui/glass";
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

  const icon = kind === "grocer" ? "🧺" : kind === "dinner" ? "🌙" : "📝";
  return (
    <Stagger className="space-y-4">
      <PageTitle sub={kind === "grocer" ? s.grocerName : `For ${s.cookName}`} title={<><span className="mr-1">{icon}</span>{title}</>} />
      <motion.p variants={rise} className="px-1 text-[14px] text-muted">
        {kind === "dinner" ? "If dinner changed today, send this. Otherwise there's nothing to do." : "Check it, then one tap to send."}
      </motion.p>
      {kind === "grocer" && v.week?.status === "draft" && v.target && (
        <Banner>
          Next week isn&apos;t approved yet.{" "}
          <button className="font-bold underline" onClick={() => approveWeek(v.target!)}>Approve as it is</button> or{" "}
          <Link className="underline" to={`/week?start=${v.target}`}>review it first</Link>.
        </Banner>
      )}
      {(kind !== "dinner" || v.text) && (
        <>
          {/* the message, as it will look in WhatsApp */}
          <motion.div variants={rise} className="flex justify-end">
            <div
              className="selectable relative max-w-[92%] whitespace-pre-wrap rounded-[22px] rounded-br-md px-4 py-3 text-[14.5px] leading-relaxed text-[#0b2915] shadow-[0_10px_30px_-12px_rgba(0,60,20,.45)]"
              style={{ background: "linear-gradient(160deg,#e7ffd9,#cdf7b7)" }}
            >
              {v.text}
              <span className="mt-1 block text-right text-[11px] text-[#4c7a55]">{v.last ? "✓✓ sent before" : "not sent yet"}</span>
            </div>
          </motion.div>
          <motion.div variants={rise}>
            <SendToCook label={label} text={v.text} link={waLink(v.phone, v.text)} kind={sentKind} forDate={v.forDate} sentAt={sentLabel(v.last?.createdAt)} />
          </motion.div>
        </>
      )}
      {!v.phone && (
        <p className="px-1 text-[13px] text-muted">
          No number saved, so WhatsApp will ask who to send it to. Add it in <Link className="font-semibold text-brand" to="/settings">Settings</Link>.
        </p>
      )}
      <Link to="/" className="block py-2 text-center text-[13px] font-semibold text-muted">Change something first</Link>
    </Stagger>
  );
}

/** The grocer order is for the coming week from Thursday on (Friday is pickup day). */
function grocerWeekFor(today: ISODate, param: string | null): ISODate {
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) return weekStartFor(param);
  const ws = weekStartFor(today);
  return [4, 5].includes(dayOfWeek(today)) ? addDays(ws, 7) : ws;
}
