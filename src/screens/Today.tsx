import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { CookReplyBox } from "@/components/CookReplyBox";
import { MealCard } from "@/components/MealCard";
import { SendToCook } from "@/components/SendToCook";
import { Banner } from "@/components/ui";
import { db } from "@/data/db";
import { getMealsMap, lastSentFor, shoppingFor, snapshotFor, weekContext } from "@/data/repo";
import { dailyMessage, dinnerChangeMessage, waLink } from "@/lib/core/cookMessages";
import { addDays, dayNameEnLong, nowIST, prettyDate, shortDate, weekStartFor } from "@/lib/core/dates";
import { SLOTS, mealKey, type Slot } from "@/lib/core/types";
import { Glass, Stagger, rise } from "@/ui/glass";
import { dishLites, mealCardProps, sentLabel, useLive } from "./view";

async function load() {
  const now = nowIST();
  const today = now.date;
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
  return { now, today, tomorrow, data, meals, lists, lastDaily, lastToday, nextWs, nextWeek, missing };
}

function greeting(hour: number) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Which of today's meals is up next (by the cook's meal times). */
function nextSlot(hour: number, hours: Record<Slot, number>): Slot | null {
  for (const s of SLOTS) if (hour < hours[s] + 1) return s;
  return null;
}

export function TodayScreen() {
  const v = useLive(load);
  if (!v) return null;
  const { now, today, tomorrow, data, meals, lists, lastDaily, lastToday, nextWs, nextWeek, missing } = v;
  const s = data.settings;
  const allDishes = dishLites(data);
  const atRisk = new Map(lists.atRisk.map((r) => [mealKey(r.date, r.slot as never), r.ingredientIds.map((id) => data.ingredients[id].nameEn)]));

  const dailyText = dailyMessage(data, meals, today);
  const tomorrowChanged = !!lastDaily?.snapshot && JSON.stringify(lastDaily.snapshot) !== JSON.stringify(snapshotFor(meals, tomorrow));
  const sentFresh = !!lastDaily && !tomorrowChanged;
  const dinner = meals[mealKey(today, "dinner")];
  const dinnerChanged = !!(lastToday?.snapshot && dinner && lastToday.snapshot.dinner !== snapshotFor(meals, today).dinner);
  const dinnerText = dinner ? dinnerChangeMessage(data, dinner) : "";
  const riskSoon = lists.atRisk.filter((r) => r.date === today || r.date === tomorrow);
  const evening = now.hour >= 17;
  const upNext = nextSlot(now.hour, s.mealHours);

  const sendCard = (
    <Glass variants={rise} strong className="overflow-hidden p-4" key="send">
      {!sentFresh && evening && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-10 -z-0 opacity-60"
          style={{ background: "radial-gradient(closest-side, rgba(62,224,125,.35), transparent)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div className="relative z-[2] space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">Tomorrow · {dayNameEnLong(tomorrow)} {shortDate(tomorrow)}</p>
            <h2 className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-[-0.03em]">
              {sentFresh ? <>{s.cookName} has tomorrow&apos;s menu <span className="text-ok">✓</span></> : tomorrowChanged ? "Menu changed, send again" : `Send tomorrow's menu to ${s.cookName}`}
            </h2>
          </div>
        </div>
        <div className="space-y-1.5">
          {SLOTS.map((slot) => {
            const p = mealCardProps(data, meals, tomorrow, slot, { allDishes });
            return (
              <div key={slot} className="flex items-baseline gap-2 text-[14px]">
                <span className="w-16 shrink-0 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{slot === "breakfast" ? "B'fast" : slot}</span>
                <span className={`min-w-0 flex-1 font-semibold ${p.skipped ? "text-muted line-through" : ""}`}>
                  {p.split ? `🍳 ${p.dish?.nameEn} · 🌿 ${p.split.altName}` : p.planBActive ? p.planBName : p.dish?.nameEn ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
        <SendToCook
          label={sentFresh ? "Send again" : `Send to ${s.cookName}`}
          text={dailyText}
          link={waLink(s.cookPhone, dailyText)}
          kind="daily"
          forDate={tomorrow}
          sentAt={sentLabel(lastDaily?.createdAt)}
          compact={sentFresh}
        />
        {!s.cookPhone && (
          <p className="text-[12px] text-muted">
            Add {s.cookName}&apos;s number in <Link className="font-semibold text-brand" to="/settings">Settings</Link> so WhatsApp opens her chat directly.
          </p>
        )}
      </div>
    </Glass>
  );

  return (
    <Stagger className="space-y-4">
      <motion.header variants={rise} className="pt-1">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{prettyDate(today)}</p>
        <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.035em]">
          {greeting(now.hour)}, <span className="text-gradient">{s.eggEater}</span>
        </h1>
      </motion.header>

      {nextWeek?.status === "draft" && (
        <Link to={`/week?start=${nextWs}`} className="block">
          <Banner tone="info">📝 Next week&apos;s menu is ready. <b className="text-brand">Review &amp; approve →</b></Banner>
        </Link>
      )}
      {riskSoon.length > 0 && (
        <Banner>
          ⚠️ Missing for {riskSoon.map((r) => `${r.date === today ? "today" : "tomorrow"} ${r.slot} (${r.ingredientIds.map((id) => data.ingredients[id].nameEn).join(", ")})`).join("; ")}.{" "}
          <Link to="/shopping?list=topup" className="font-semibold underline">Top-up list</Link>
        </Banner>
      )}
      {missing.length > 0 && riskSoon.length === 0 && (
        <Banner>
          {s.cookName} said these ran out: {missing.map((m) => data.ingredients[m.ingredientId]?.nameEn).join(", ")}. On the{" "}
          <Link to="/shopping?list=topup" className="font-semibold underline">top-up list</Link>.
        </Banner>
      )}

      {dinnerChanged && (
        <Glass variants={rise} strong className="p-4" style={{ boxShadow: "inset 0 0 0 1.5px var(--wa), var(--glass-shadow)" }}>
          <div className="relative z-[2] space-y-2">
            <p className="font-bold">Tonight&apos;s dinner changed after {s.cookName} was told.</p>
            <SendToCook compact label="Send dinner change" text={dinnerText} link={waLink(s.cookPhone, dinnerText)} kind="dinner_change" forDate={today} />
          </div>
        </Glass>
      )}

      {evening && sendCard}

      <motion.h2 variants={rise} className="px-1 pt-1 text-[20px] font-extrabold tracking-[-0.02em]">Today</motion.h2>
      {SLOTS.map((slot) => (
        <div key={slot} className="relative">
          {upNext === slot && (
            <motion.span
              layoutId="up-next"
              className="absolute -top-2 right-4 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white"
              style={{ background: "linear-gradient(135deg,var(--brand-2),var(--brand))", boxShadow: "0 4px 12px -2px rgba(242,102,42,.5)" }}
            >
              Next up
            </motion.span>
          )}
          <MealCard {...mealCardProps(data, meals, today, slot, { atRisk, allDishes })} />
        </div>
      ))}

      {!evening && (
        <>
          <motion.h2 variants={rise} className="px-1 pt-2 text-[20px] font-extrabold tracking-[-0.02em]">Tomorrow</motion.h2>
          {sendCard}
        </>
      )}

      <CookReplyBox cookName={s.cookName} />
    </Stagger>
  );
}
