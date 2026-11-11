import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CopyButton, PickupDone, ReportLow, ShoppingList, type ItemView } from "@/components/ShoppingList";
import { Banner } from "@/components/ui";
import { ensureWeek, shoppingFor, shoppingWeekDefault } from "@/data/repo";
import { openExternal } from "@/native/device";
import { addDays, nowIST, prettyDate, weekStartFor } from "@/lib/core/dates";
import { blinkitSearchUrl, grocerOrderText, type ShoppingItem } from "@/lib/core/shopping";
import { useLive } from "./view";

const LISTS = [
  { key: "grocer", label: "Shubham" },
  { key: "blinkit", label: "Blinkit" },
  { key: "topup", label: "Top-up" },
  { key: "staples", label: "Staples" },
] as const;
type ListKey = (typeof LISTS)[number]["key"];

export function ShoppingScreen() {
  const [sp, setSp] = useSearchParams();
  const thisWs = weekStartFor(nowIST().date);
  const nextWs = addDays(thisWs, 7);
  const [defaultWs, setDefaultWs] = useState<string | null>(null);
  useEffect(() => { shoppingWeekDefault().then(setDefaultWs); }, []);
  const ws = sp.get("week") === "next" ? nextWs : sp.get("week") === "this" ? thisWs : defaultWs;
  const list = (LISTS.find((l) => l.key === sp.get("list"))?.key ?? "grocer") as ListKey;
  useEffect(() => { if (ws) ensureWeek(ws); }, [ws]);

  const v = useLive(async () => (ws ? shoppingFor(ws) : null), [ws]);
  if (!ws || !v) return null;
  const { data, lists, week, staples } = v;
  const s = data.settings;

  const view = (items: ShoppingItem[], withSearch = false): ItemView[] =>
    items.map((i) => ({
      ingredientId: i.ingredientId, name: i.nameEn, nameCook: i.nameCook, qty: i.qtyLabel, usedFor: i.usedFor,
      note: i.note, ticked: i.ticked, searchUrl: withSearch && s.blinkitLinks ? blinkitSearchUrl(i.nameEn) : undefined,
    }));
  const go = (patch: Record<string, string>) => setSp({ list, week: ws === nextWs ? "next" : "this", ...patch });
  const grocerPhone = s.grocerPhone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1");

  return (
    <div className="space-y-4 pb-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Shopping</h1>
        <p className="text-sm text-muted">For {prettyDate(ws)} to {prettyDate(addDays(ws, 6))}{week?.status === "draft" && " · menu not approved yet"}</p>
      </header>
      <div className="flex gap-2">
        {([["this", thisWs, "This week"], ["next", nextWs, "Next week"]] as const).map(([k, w, label]) => (
          <button key={k} onClick={() => go({ week: k })} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${ws === w ? "bg-brand text-brand-ink" : "border border-line bg-card"}`}>{label}</button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-soft p-1">
        {LISTS.map((l) => {
          const open = lists[l.key].filter((i) => !i.ticked).length;
          return (
            <button key={l.key} onClick={() => go({ list: l.key })} className={`flex h-12 flex-col items-center justify-center rounded-xl text-sm font-semibold ${list === l.key ? "bg-card shadow-sm" : "text-muted"}`}>
              {l.label}
              <span className="text-[11px] font-normal">{open || "✓"}</span>
            </button>
          );
        })}
      </div>

      {week?.status === "draft" && <Banner>This menu is still a draft. <Link className="underline" to={`/week?start=${ws}`}>Approve it</Link> before ordering.</Banner>}

      {list === "grocer" && (
        <>
          <Link to={`/send/grocer?week=${ws}`} className="flex h-12 items-center justify-center rounded-xl bg-wa font-semibold text-white">Send order on WhatsApp</Link>
          <div className="flex gap-2">
            {grocerPhone && <button onClick={() => openExternal(`tel:+${grocerPhone}`)} className="h-12 flex-1 rounded-xl border border-line font-semibold">📞 Call</button>}
            <Link to={`/counter?week=${ws}`} className="flex h-12 flex-1 items-center justify-center rounded-xl border border-line font-semibold">Show at counter</Link>
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
          <p className="text-sm text-muted">Optional Tuesday top-up: fragile items for Wed to Fri, plus anything missed or run out.</p>
          <ShoppingList weekStart={ws} list="topup" items={view(lists.topup, true)} emptyText="No top-up needed this week 🎉" />
          {lists.atRisk.length > 0 && (
            <Banner>At risk until topped up: {lists.atRisk.map((r) => `${prettyDate(r.date)} ${r.slot}: ${data.dishes[r.dishId].nameEn}`).join("; ")}</Banner>
          )}
        </>
      )}

      {list === "staples" && (
        <>
          <p className="text-sm text-muted">Due on their restock cycle or marked low. Ticking marks them bought today.</p>
          <ShoppingList weekStart={ws} list="staples" items={view(lists.staples, true)} emptyText="No staples due this week." />
          <ReportLow
            staples={Object.values(data.ingredients)
              .filter((i) => i.category === "staple" && (i.restockDays ?? 0) > 1)
              .map((i) => ({ id: i.id, name: i.nameEn, low: !!staples.find((x) => x.ingredientId === i.id)?.lowReportedAt }))
              .sort((a, b) => a.name.localeCompare(b.name))}
          />
        </>
      )}
    </div>
  );
}
