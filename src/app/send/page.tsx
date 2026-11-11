import Link from "next/link";
import { SendToCook } from "@/components/SendToCook";
import { addDays, nowIST, prettyDate, weekStartFor } from "@/lib/core/dates";
import { dailyMessage, dinnerChangeMessage, waLink } from "@/lib/core/cookMessages";
import { mealKey } from "@/lib/core/types";
import * as repo from "@/lib/db/repo";
import { ensureWeek, weekContext } from "@/lib/services";
import { sentLabel } from "@/lib/view";

export const dynamic = "force-dynamic";

/** Opened from the 9 pm (and 4 pm) notifications: one big button. */
export default async function SendPage({ searchParams }: { searchParams: Promise<{ evening?: string; kind?: string; date?: string }> }) {
  const sp = await searchParams;
  const today = nowIST().date;
  const valid = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);

  if (sp.kind === "dinner") {
    const date = valid(sp.date) ?? today;
    const { data, meals } = await weekContext(weekStartFor(date));
    const m = meals[mealKey(date, "dinner")];
    const text = m ? dinnerChangeMessage(data, m) : "";
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Tonight&apos;s dinner changed</h1>
        {m ? <SendToCook label="Send dinner change" text={text} link={waLink(data.settings.cookPhone, text)} kind="dinner_change" forDate={date} /> : <p>No dinner planned.</p>}
        <Link href="/" className="block text-center text-sm text-muted underline">Open Today</Link>
      </div>
    );
  }

  const evening = valid(sp.evening) ?? today;
  const forDate = addDays(evening, 1);
  await ensureWeek(weekStartFor(forDate), { approve: true });
  const a = await weekContext(weekStartFor(evening));
  const b = weekStartFor(forDate) === weekStartFor(evening) ? a : await weekContext(weekStartFor(forDate));
  const meals = { ...a.meals, ...b.meals };
  const text = dailyMessage(a.data, meals, evening);
  const last = await repo.lastSentFor(["daily"], forDate);
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Menu for {prettyDate(forDate)}</h1>
        <p className="text-sm text-muted">Check, then send. Change anything on the Today or Week tab first.</p>
      </header>
      <pre className="whitespace-pre-wrap font-sans rounded-2xl border border-line bg-card p-4 text-[15px] leading-relaxed">{text}</pre>
      <SendToCook label={`Send to ${a.data.settings.cookName}`} text={text} link={waLink(a.data.settings.cookPhone, text)} kind="daily" forDate={forDate} sentAt={sentLabel(last?.createdAt)} />
      <Link href="/" className="block text-center text-sm text-muted underline">Change something first</Link>
    </div>
  );
}
