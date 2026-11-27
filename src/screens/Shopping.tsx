import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CopyButton, PickupDone, Progress, ReportLow, ShoppingList, type ItemView } from "@/components/ShoppingList";
import { Banner, PageTitle } from "@/components/ui";
import { ensureWeek, shoppingFor, shoppingWeekDefault } from "@/data/repo";
import { openExternal } from "@/native/device";
import { addDays, nowIST, prettyDate, weekStartFor } from "@/lib/core/dates";
import { blinkitSearchUrl, grocerOrderText, type ShoppingItem } from "@/lib/core/shopping";
import { Press, Segmented, Stagger, rise, spring } from "@/ui/glass";
import { useLive } from "./view";

type ListKey = "grocer" | "blinkit" | "topup" | "staples";

export function ShoppingScreen() {
  const [sp, setSp] = useSearchParams();
  const thisWs = weekStartFor(nowIST().date);
  const nextWs = addDays(thisWs, 7);
  const [defaultWs, setDefaultWs] = useState<string | null>(null);
  useEffect(() => { shoppingWeekDefault().then(setDefaultWs); }, []);
  const ws = sp.get("week") === "next" ? nextWs : sp.get("week") === "this" ? thisWs : defaultWs;
  const list = (["grocer", "blinkit", "topup", "staples"].includes(sp.get("list") ?? "") ? sp.get("list") : "grocer") as ListKey;
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
  const go = (patch: Record<string, string>) => setSp({ list, week: ws === nextWs ? "next" : "this", ...patch }, { replace: true });
  const grocerPhone = s.grocerPhone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1");
  const current = lists[list];
  const done = current.filter((i) => i.ticked).length;

  return (
    <Stagger className="space-y-4">
      <PageTitle
        sub={`${prettyDate(ws)} – ${prettyDate(addDays(ws, 6))}${week?.status === "draft" ? " · draft menu" : ""}`}
        title="Shopping"
        right={<div className="mb-0.5"><Progress done={done} total={current.length} /></div>}
      />
      <motion.div variants={rise}>
        <Segmented
          value={ws === nextWs ? "next" : "this"}
          onChange={(w) => go({ week: w })}
          options={[{ value: "this", label: "This week" }, { value: "next", label: "Next week" }]}
        />
      </motion.div>
      <motion.div variants={rise}>
        <Segmented<ListKey>
          value={list}
          onChange={(l) => go({ list: l })}
          options={(["grocer", "blinkit", "topup", "staples"] as const).map((k) => ({
            value: k,
            label: { grocer: "Shubham", blinkit: "Blinkit", topup: "Top-up", staples: "Staples" }[k],
            badge: lists[k].filter((i) => !i.ticked).length || "✓",
          }))}
        />
      </motion.div>

      {week?.status === "draft" && (
        <Banner>This menu is still a draft. <Link className="font-semibold underline" to={`/week?start=${ws}`}>Approve it</Link> before ordering.</Banner>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={list}
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
          exit={{ opacity: 0, y: -6 }}
          transition={spring}
          className="space-y-3"
        >
          {list === "grocer" && (
            <>
              <Link to={`/send/grocer?week=${ws}`} className="btn-wa flex h-[54px] items-center justify-center rounded-[20px] text-[16px] font-bold">
                Send order on WhatsApp
              </Link>
              <div className="flex gap-2">
                {grocerPhone && <Press className="flex-1" onClick={() => openExternal(`tel:+${grocerPhone}`)}>📞 Call</Press>}
                <Link to={`/counter?week=${ws}`} className="btn-glass flex h-12 flex-1 items-center justify-center rounded-[18px] text-[15px] font-semibold">Show at counter</Link>
                <CopyButton text={grocerOrderText(lists.grocer, s)} label="Copy" />
              </div>
              <ShoppingList weekStart={ws} list="grocer" items={view(lists.grocer)} emptyText="Nothing to buy here this week." />
              <PickupDone weekStart={ws} done={!!week?.pickupDoneAt} />
            </>
          )}

          {list === "blinkit" && (
            <>
              <p className="px-1 text-[13px] text-muted">One Blinkit order for the week, including the weekly items. &quot;Find&quot; opens a Blinkit search.</p>
              <div className="flex gap-2"><CopyButton text={lists.blinkit.map((i) => `${i.nameEn}: ${i.qtyLabel}`).join("\n")} label="Copy list" /></div>
              <ShoppingList weekStart={ws} list="blinkit" items={view(lists.blinkit, true)} emptyText="Nothing from Blinkit this week." />
            </>
          )}

          {list === "topup" && (
            <>
              <p className="px-1 text-[13px] text-muted">Optional Tuesday top-up: fragile items for Wed to Fri, plus anything missed or run out.</p>
              <ShoppingList weekStart={ws} list="topup" items={view(lists.topup, true)} emptyText="No top-up needed this week 🎉" />
              {lists.atRisk.length > 0 && (
                <Banner>At risk until topped up: {lists.atRisk.map((r) => `${prettyDate(r.date)} ${r.slot}: ${data.dishes[r.dishId].nameEn}`).join("; ")}</Banner>
              )}
            </>
          )}

          {list === "staples" && (
            <>
              <p className="px-1 text-[13px] text-muted">Due on their restock cycle or marked low. Ticking marks them bought today.</p>
              <ShoppingList weekStart={ws} list="staples" items={view(lists.staples, true)} emptyText="No staples due this week." />
              <ReportLow
                staples={Object.values(data.ingredients)
                  .filter((i) => i.category === "staple" && (i.restockDays ?? 0) > 1)
                  .map((i) => ({ id: i.id, name: i.nameEn, low: !!staples.find((x) => x.ingredientId === i.id)?.lowReportedAt }))
                  .sort((a, b) => a.name.localeCompare(b.name))}
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </Stagger>
  );
}
