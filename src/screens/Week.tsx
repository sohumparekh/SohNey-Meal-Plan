import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SendToCook } from "@/components/SendToCook";
import { WeekGrid, type WeekRow } from "@/components/WeekGrid";
import { PageTitle, Pill } from "@/components/ui";
import { Stagger } from "@/ui/glass";
import { motion } from "motion/react";
import { ensureWeek, lastSentFor, weekContext } from "@/data/repo";
import { effectiveDish, waLink, weekOverviewMessage } from "@/lib/core/cookMessages";
import { addDays, dayInWeek, nowIST, prettyDate, weekDates, weekStartFor } from "@/lib/core/dates";
import { needsTopup } from "@/lib/core/shelf";
import { SLOTS, mealKey } from "@/lib/core/types";
import { dishLites, sentLabel, useLive } from "./view";

export function WeekScreen() {
  const [sp] = useSearchParams();
  const today = nowIST().date;
  const thisWs = weekStartFor(today);
  const raw = sp.get("start");
  const start = raw === "next" ? addDays(thisWs, 7) : raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? weekStartFor(raw) : thisWs;

  useEffect(() => { ensureWeek(start); }, [start]);
  const v = useLive(async () => {
    const ctx = await weekContext(start);
    return { ...ctx, lastOverview: await lastSentFor(["week"], start) };
  }, [start]);
  if (!v) return null;
  const { data, meals, week, lastOverview } = v;
  if (!week) return <p className="py-10 text-center text-muted">Preparing the week…</p>;
  const isNext = start === addDays(thisWs, 7);

  const rows: WeekRow[] = weekDates(start).map((d) => ({
    date: d,
    label: prettyDate(d),
    isToday: d === today,
    past: d < today,
    cells: SLOTS.map((slot) => {
      const m = meals[mealKey(d, slot)];
      const dish = m ? effectiveDish(data, m) : undefined;
      const base = m ? data.dishes[m.dishId] : undefined;
      const alt = base?.forOne && m?.altDishId && !m.planB ? data.dishes[m.altDishId] : undefined;
      return {
        slot,
        name: dish?.nameEn ?? "Not planned",
        altName: alt?.nameEn ?? null,
        skipped: m?.status === "skipped",
        planB: !!m?.planB,
        prep: !!base?.prepAhead,
        topup: !!base && needsTopup(base, dayInWeek(d), data.ingredients),
        changed: m?.status === "swapped",
      };
    }),
  }));
  const overview = weekOverviewMessage(data, meals, start);

  return (
    <Stagger className="space-y-4">
      <PageTitle
        sub={`${prettyDate(start)} – ${prettyDate(addDays(start, 6))} · rotation ${week.rotationWeek}`}
        title={start === thisWs ? "This week" : isNext ? "Next week" : "Week"}
        right={
          <span
            className="mb-1.5 rounded-full px-3 py-1 text-[12px] font-bold"
            style={week.status === "approved" ? { background: "rgba(23,163,74,.14)", color: "var(--ok)" } : { background: "var(--warn-bg)", color: "var(--warn-ink)" }}
          >
            {week.status === "approved" ? "Approved" : "Draft"}
          </span>
        }
      />
      <motion.div variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
        <Pill href={`/week?start=${addDays(start, -7)}`}>‹</Pill>
        <Pill href={`/week?start=${thisWs}`} active={start === thisWs}>This week</Pill>
        <Pill href={`/week?start=${addDays(thisWs, 7)}`} active={isNext}>Next week</Pill>
        <Pill href={`/week?start=${addDays(start, 7)}`}>›</Pill>
      </motion.div>
      <p className="px-1 text-[12px] text-muted">Tap any meal to swap it · ★ prep the day before · 🍳 {data.settings.eggEater} · 🌿 {data.settings.nonEggEater}</p>

      <WeekGrid weekStart={start} rows={rows} status={week.status} allDishes={dishLites(data)} canRedraft={start > today} />

      {week.status === "approved" && start >= thisWs && (
        <section className="space-y-2 pb-4">
          <h2 className="px-1 text-[17px] font-bold tracking-tight">Send the whole week to {data.settings.cookName}</h2>
          <SendToCook compact label="Send week menu" text={overview} link={waLink(data.settings.cookPhone, overview)} kind="week" forDate={start} sentAt={sentLabel(lastOverview?.createdAt)} />
        </section>
      )}
    </Stagger>
  );
}
