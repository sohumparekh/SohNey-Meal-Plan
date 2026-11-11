import { SendToCook } from "@/components/SendToCook";
import { WeekGrid, type WeekRow } from "@/components/WeekGrid";
import { Pill } from "@/components/ui";
import { addDays, dayInWeek, nowIST, prettyDate, weekDates, weekStartFor } from "@/lib/core/dates";
import { effectiveDish, waLink, weekOverviewMessage } from "@/lib/core/cookMessages";
import { needsTopup } from "@/lib/core/shelf";
import { SLOTS, mealKey } from "@/lib/core/types";
import * as repo from "@/lib/db/repo";
import { ensureWeek, weekContext } from "@/lib/services";
import { dishLites, sentLabel } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ start?: string }> }) {
  const sp = await searchParams;
  const today = nowIST().date;
  const thisWs = weekStartFor(today);
  const start = sp.start && /^\d{4}-\d{2}-\d{2}$/.test(sp.start) ? weekStartFor(sp.start) : thisWs;
  await ensureWeek(start);
  const { data, meals, week } = await weekContext(start);

  const rows: WeekRow[] = weekDates(start).map((d) => ({
    date: d,
    label: prettyDate(d),
    isToday: d === today,
    past: d < today,
    cells: SLOTS.map((slot) => {
      const m = meals[mealKey(d, slot)];
      const dish = m ? effectiveDish(data, m) : undefined;
      const base = m ? data.dishes[m.dishId] : undefined;
      return {
        slot,
        name: dish?.nameEn ?? "Not planned",
        skipped: m?.status === "skipped",
        planB: !!m?.planB,
        prep: !!base?.prepAhead,
        topup: !!base && needsTopup(base, dayInWeek(d), data.ingredients),
        changed: m?.status === "swapped",
      };
    }),
  }));

  const overview = weekOverviewMessage(data, meals, start);
  const lastOverview = await repo.lastSentFor(["week"], start);
  const prev = addDays(start, -7), next = addDays(start, 7);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Week</h1>
        <p className="text-sm text-muted">
          {prettyDate(start)} to {prettyDate(addDays(start, 6))} · rotation week {week?.rotationWeek} ·{" "}
          {week?.status === "approved" ? "approved" : "draft"}
        </p>
      </header>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Pill href={`/week?start=${prev}`}>‹ Earlier</Pill>
        <Pill href={`/week?start=${thisWs}`} active={start === thisWs}>This week</Pill>
        <Pill href={`/week?start=${addDays(thisWs, 7)}`} active={start === addDays(thisWs, 7)}>Next week</Pill>
        <Pill href={`/week?start=${next}`}>Later ›</Pill>
      </div>
      <p className="text-xs text-muted">Tap any meal to swap it. ★ = prep the day before.</p>

      <WeekGrid
        weekStart={start}
        rows={rows}
        status={week?.status ?? "draft"}
        allDishes={dishLites(data)}
        canRedraft={start > today}
      />

      {week?.status === "approved" && start >= thisWs && (
        <section className="space-y-2">
          <h2 className="font-semibold">Send the whole week to {data.settings.cookName}</h2>
          <SendToCook compact label="Send week menu" text={overview} link={waLink(data.settings.cookPhone, overview)} kind="week" forDate={start} sentAt={sentLabel(lastOverview?.createdAt)} />
        </section>
      )}
    </div>
  );
}
