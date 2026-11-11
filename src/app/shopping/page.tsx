import Link from "next/link";
import { CopyButton, PickupDone, ReportLow, ShoppingList, type ItemView } from "@/components/ShoppingList";
import { Banner, Pill } from "@/components/ui";
import { addDays, dayOfWeek, nowIST, prettyDate, weekStartFor } from "@/lib/core/dates";
import { blinkitSearchUrl, grocerOrderText, type ShoppingItem } from "@/lib/core/shopping";
import * as repo from "@/lib/db/repo";
import { ensureWeek, shoppingFor } from "@/lib/services";

export const dynamic = "force-dynamic";

const LISTS = [
  { key: "grocer", label: "Shubham" },
  { key: "blinkit", label: "Blinkit" },
  { key: "topup", label: "Top-up" },
  { key: "staples", label: "Staples" },
] as const;

export default async function ShoppingPage({ searchParams }: { searchParams: Promise<{ list?: string; week?: string }> }) {
  const sp = await searchParams;
  const today = nowIST().date;
  const thisWs = weekStartFor(today);
  const nextWs = addDays(thisWs, 7);
  const next = await repo.getWeek(nextWs);
  // On Thu/Fri, once next week is approved, shopping is for next week.
  const defaultWs = next?.status === "approved" && [4, 5].includes(dayOfWeek(today)) ? nextWs : thisWs;
  const ws = sp.week === "next" ? nextWs : sp.week === "this" ? thisWs : defaultWs;
  const list = (LISTS.find((l) => l.key === sp.list)?.key ?? "grocer") as (typeof LISTS)[number]["key"];

  await ensureWeek(ws);
  const { data, lists, week } = await shoppingFor(ws);
  const s = data.settings;
  const staples = await repo.getStaples();

  const view = (items: ShoppingItem[], withSearch = false): ItemView[] =>
    items.map((i) => ({
      ingredientId: i.ingredientId, name: i.nameEn, nameCook: i.nameCook, qty: i.qtyLabel, usedFor: i.usedFor,
      note: i.note, ticked: i.ticked, searchUrl: withSearch && s.blinkitLinks ? blinkitSearchUrl(i.nameEn) : undefined,
    }));
  const q = (w: string) => `/shopping?list=${list}&week=${w}`;
  const counts = { grocer: lists.grocer, blinkit: lists.blinkit, topup: lists.topup, staples: lists.staples };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Shopping</h1>
        <p className="text-sm text-muted">
          For {prettyDate(ws)} to {prettyDate(addDays(ws, 6))}
          {week?.status === "draft" && " · menu not approved yet"}
        </p>
      </header>
      <div className="flex gap-2">
        <Pill href={q("this")} active={ws === thisWs}>This week</Pill>
        <Pill href={q("next")} active={ws === nextWs}>Next week</Pill>
      </div>
      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-soft p-1">
        {LISTS.map((l) => {
          const open = counts[l.key].filter((i) => !i.ticked).length;
          return (
            <Link
              key={l.key}
              href={`/shopping?list=${l.key}&week=${ws === nextWs ? "next" : "this"}`}
              className={`flex h-12 flex-col items-center justify-center rounded-xl text-sm font-semibold ${list === l.key ? "bg-card shadow-sm" : "text-muted"}`}
            >
              {l.label}
              <span className="text-[11px] font-normal">{open || "✓"}</span>
            </Link>
          );
        })}
      </div>

      {week?.status === "draft" && (
        <Banner>This menu is still a draft. <Link className="underline" href={`/week?start=${ws}`}>Approve it</Link> before ordering.</Banner>
      )}

      {list === "grocer" && (
        <>
          <div className="flex gap-2">
            {s.grocerPhone && (
              <a href={`tel:+${s.grocerPhone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`} className="flex h-12 flex-1 items-center justify-center rounded-xl bg-brand font-semibold text-brand-ink">
                📞 Call {s.grocerName.split(" ")[0]}
              </a>
            )}
            <Link href={`/counter?week=${ws}`} className="flex h-12 flex-1 items-center justify-center rounded-xl border border-line font-semibold">
              Show at counter
            </Link>
          </div>
          <div className="flex gap-2"><CopyButton text={grocerOrderText(lists.grocer, s)} label="Copy order text" /></div>
          <ShoppingList weekStart={ws} list="grocer" items={view(lists.grocer)} emptyText="Nothing to buy here this week." />
          <PickupDone weekStart={ws} done={!!week?.pickupDoneAt} />
        </>
      )}

      {list === "blinkit" && (
        <>
          <p className="text-sm text-muted">Order these on Blinkit in one go. &quot;Find&quot; opens a Blinkit search for the item.</p>
          <div className="flex gap-2"><CopyButton text={lists.blinkit.map((i) => `${i.nameEn}: ${i.qtyLabel}`).join("\n")} label="Copy list" /></div>
          <ShoppingList weekStart={ws} list="blinkit" items={view(lists.blinkit, true)} emptyText="Nothing from Blinkit this week." />
        </>
      )}

      {list === "topup" && (
        <>
          <p className="text-sm text-muted">Optional Tuesday top-up: fragile items for Wed to Fri, plus anything missed or run out. Pick up from {s.grocerName} on Tuesday evening, or Blinkit.</p>
          <ShoppingList weekStart={ws} list="topup" items={view(lists.topup, true)} emptyText="No top-up needed this week 🎉" />
          {lists.atRisk.length > 0 && (
            <Banner>
              At risk until topped up:{" "}
              {lists.atRisk.map((r) => `${prettyDate(r.date)} ${r.slot}: ${data.dishes[r.dishId].nameEn}`).join("; ")}
            </Banner>
          )}
        </>
      )}

      {list === "staples" && (
        <>
          <p className="text-sm text-muted">Due on their restock cycle or reported low. Ticking marks them bought today.</p>
          <ShoppingList weekStart={ws} list="staples" items={view(lists.staples, true)} emptyText="No staples due this week." />
          <ReportLow
            staples={Object.values(data.ingredients)
              .filter((i) => i.category === "staple" && (i.restockDays ?? 0) > 1)
              .map((i) => ({ id: i.id, name: i.nameEn, low: !!staples[i.id]?.lowReportedAt }))
              .sort((a, b) => a.name.localeCompare(b.name))}
          />
        </>
      )}
    </div>
  );
}
