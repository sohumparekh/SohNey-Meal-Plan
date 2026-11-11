import Link from "next/link";
import { weekStartFor, nowIST } from "@/lib/core/dates";
import { shoppingFor } from "@/lib/services";

export const dynamic = "force-dynamic";

/** Big-text list to show the shopkeeper across the counter. */
export default async function CounterPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams;
  const ws = sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? sp.week : weekStartFor(nowIST().date);
  const { lists, data } = await shoppingFor(ws);
  const items = lists.grocer.filter((i) => !i.ticked);
  return (
    <div className="min-h-dvh py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{data.settings.grocerName}</h1>
        <Link href={`/shopping?list=grocer`} className="rounded-lg border border-line px-3 py-2 text-sm">Close</Link>
      </div>
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.ingredientId} className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
            <span className="text-2xl font-semibold">{i.nameCook.split(" / ")[0]}<span className="ml-2 text-base font-normal text-muted">{i.nameEn}</span></span>
            <span className="shrink-0 text-2xl font-bold">{i.qtyLabel}</span>
          </li>
        ))}
      </ul>
      {!items.length && <p className="text-xl">Everything is ticked ✓</p>}
    </div>
  );
}
