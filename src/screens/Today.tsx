import { Link } from "react-router-dom";
import { CookReplyBox } from "@/components/CookReplyBox";
import { MealCard } from "@/components/MealCard";
import { SendToCook } from "@/components/SendToCook";
import { Banner } from "@/components/ui";
import { db } from "@/data/db";
import { getMealsMap, lastSentFor, shoppingFor, snapshotFor, weekContext } from "@/data/repo";
import { dailyMessage, dinnerChangeMessage, waLink } from "@/lib/core/cookMessages";
import { addDays, nowIST, prettyDate, weekStartFor } from "@/lib/core/dates";
import { SLOTS, mealKey } from "@/lib/core/types";
import { dishLites, mealCardProps, sentLabel, useLive } from "./view";

async function load() {
  const today = nowIST().date;
  const tomorrow = addDays(today, 1);
  const ws = weekStartFor(today);
  const { data } = await weekContext(ws);
  const meals = await getMealsMap(addDays(today, -1), addDays(today, 3));
  const { lists } = await shoppingFor(ws);
  const lastDaily = await lastSentFor(["daily"], tomorrow);
  const lastToday = await lastSentFor(["daily", "dinner_change", "eating_out"], today);
  const nextWs = addDays(ws, 7);
  const nextWeek = await db.weeks.get(nextWs);
  const missing = await db.missing.where("date").aboveOrEqual(addDays(today, -2)).filter((m) => !m.resolved).toArray();
  return { today, tomorrow, data, meals, lists, lastDaily, lastToday, nextWs, nextWeek, missing };
}

export function TodayScreen() {
  const v = useLive(load);
  if (!v) return null;
  const { today, tomorrow, data, meals, lists, lastDaily, lastToday, nextWs, nextWeek, missing } = v;
  const s = data.settings;
  const allDishes = dishLites(data);
  const atRisk = new Map(lists.atRisk.map((r) => [mealKey(r.date, r.slot as never), r.ingredientIds.map((id) => data.ingredients[id].nameEn)]));

  const dailyText = dailyMessage(data, meals, today);
  const tomorrowChanged = !!lastDaily?.snapshot && JSON.stringify(lastDaily.snapshot) !== JSON.stringify(snapshotFor(meals, tomorrow));
  const dinner = meals[mealKey(today, "dinner")];
  const dinnerChanged = !!(lastToday?.snapshot && dinner && lastToday.snapshot.dinner !== snapshotFor(meals, today).dinner);
  const dinnerText = dinner ? dinnerChangeMessage(data, dinner) : "";
  const riskSoon = lists.atRisk.filter((r) => r.date === today || r.date === tomorrow);

  return (
    <div className="space-y-4 pb-6">
      <header>
        <p className="text-sm text-muted">{prettyDate(today)}</p>
        <h1 className="text-2xl font-bold tracking-tight">Today</h1>
      </header>

      {nextWeek?.status === "draft" && (
        <Link to={`/week?start=${nextWs}`} className="block"><Banner tone="info">📝 Next week&apos;s menu is ready. <b>Review &amp; approve</b> →</Banner></Link>
      )}
      {riskSoon.length > 0 && (
        <Banner>
          ⚠️ Missing for {riskSoon.map((r) => `${r.date === today ? "today" : "tomorrow"} ${r.slot} (${r.ingredientIds.map((id) => data.ingredients[id].nameEn).join(", ")})`).join("; ")}.{" "}
          <Link to="/shopping?list=topup" className="underline">Top-up list</Link>
        </Banner>
      )}
      {missing.length > 0 && riskSoon.length === 0 && (
        <Banner>{s.cookName} said these ran out: {missing.map((m) => data.ingredients[m.ingredientId]?.nameEn).join(", ")}. On the <Link to="/shopping?list=topup" className="underline">top-up list</Link>.</Banner>
      )}

      {dinnerChanged && (
        <div className="rounded-2xl border-2 border-wa p-4">
          <p className="mb-2 font-semibold">Tonight&apos;s dinner changed after {s.cookName} was told.</p>
          <SendToCook compact label="Send dinner change" text={dinnerText} link={waLink(s.cookPhone, dinnerText)} kind="dinner_change" forDate={today} />
        </div>
      )}

      <div className="space-y-3">
        {SLOTS.map((slot) => <MealCard key={slot} {...mealCardProps(data, meals, today, slot, { atRisk, allDishes })} />)}
      </div>

      <section className="space-y-3 pt-2">
        <h2 className="text-lg font-bold">Tomorrow · {prettyDate(tomorrow)}</h2>
        <div className="space-y-2">
          {SLOTS.map((slot) => <MealCard key={slot} {...mealCardProps(data, meals, tomorrow, slot, { atRisk, allDishes, compact: true })} />)}
        </div>
        {tomorrowChanged && <Banner>Tomorrow&apos;s menu changed after you sent it. Send again.</Banner>}
        <SendToCook
          label={`Send tomorrow's menu to ${s.cookName}`}
          text={dailyText}
          link={waLink(s.cookPhone, dailyText)}
          kind="daily"
          forDate={tomorrow}
          sentAt={sentLabel(lastDaily?.createdAt)}
        />
        {!s.cookPhone && <p className="text-xs text-muted">Add {s.cookName}&apos;s number in <Link className="underline" to="/settings">Settings</Link> so WhatsApp opens her chat directly.</p>}
      </section>

      <CookReplyBox cookName={s.cookName} />
    </div>
  );
}
