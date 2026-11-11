import { useState, useTransition } from "react";
import { reportStapleLow, setPickupDone, setTick } from "@/data/repo";
import { copyText, openExternal } from "@/native/device";

export interface ItemView {
  ingredientId: string;
  name: string;
  nameCook: string;
  qty: string;
  usedFor: string[];
  note?: string;
  ticked: boolean;
  searchUrl?: string;
}

export function ShoppingList({
  weekStart, list, items, emptyText,
}: { weekStart: string; list: string; items: ItemView[]; emptyText: string }) {
  const optimistic = items;
  const [open, setOpen] = useState<string | null>(null);
  if (!items.length) return <p className="rounded-2xl border border-line bg-card p-6 text-center text-muted">{emptyText}</p>;
  const left = optimistic.filter((i) => !i.ticked).length;
  return (
    <div>
      <p className="mb-2 text-sm text-muted">{left === 0 ? "All done ✓" : `${left} of ${optimistic.length} left`}</p>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
        {optimistic.map((i) => (
          <li key={i.ingredientId} className="flex items-center gap-3 px-3">
            <button
              aria-label={i.ticked ? `Untick ${i.name}` : `Tick ${i.name}`}
              onClick={() => setTick(weekStart, list, i.ingredientId, !i.ticked)}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${i.ticked ? "border-ok bg-ok text-white" : "border-line"}`}
            >
              {i.ticked && "✓"}
            </button>
            <button className="min-h-14 flex-1 py-2 text-left" onClick={() => setOpen(open === i.ingredientId ? null : i.ingredientId)}>
              <div className={`font-medium ${i.ticked ? "text-muted line-through" : ""}`}>
                {i.name} <span className="text-xs font-normal text-muted">{i.nameCook.split(" / ")[0]}</span>
              </div>
              {(i.note || open === i.ingredientId) && (
                <div className="text-xs text-muted">
                  {i.note}
                  {open === i.ingredientId && i.usedFor.length > 0 && <div>For: {i.usedFor.join("; ")}</div>}
                </div>
              )}
            </button>
            <span className="shrink-0 text-right text-sm font-semibold">{i.qty}</span>
            {i.searchUrl && (
              <button onClick={() => openExternal(i.searchUrl!)} className="shrink-0 rounded-lg border border-line px-2 py-2 text-xs">
                Find ↗
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PickupDone({ weekStart, done }: { weekStart: string; done: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => setPickupDone(weekStart, !done))}
      className={`h-12 w-full rounded-xl font-semibold ${done ? "border border-line text-muted" : "bg-ok text-white"}`}
    >
      {done ? "Pickup marked done (undo)" : "Pickup done: unticked items go to top-up"}
    </button>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await copyText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="h-12 flex-1 rounded-xl border border-line font-medium active:bg-soft"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

export function ReportLow({ staples }: { staples: { id: string; name: string; low: boolean }[] }) {
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const t = q.trim().toLowerCase();
  const shown = staples.filter((s) => s.low || (t && s.name.toLowerCase().includes(t))).slice(0, 12);
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="font-semibold">Running low?</h2>
      <p className="mb-2 text-sm text-muted">Search a staple and mark it. It goes on the next list.</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="atta, ghee, jeera…" className="h-12 w-full rounded-xl border border-line bg-bg px-4" />
      <ul className="mt-2 space-y-1">
        {shown.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-1">
            <span>{s.name}</span>
            <button
              disabled={pending}
              onClick={() => start(() => reportStapleLow(s.id, !s.low))}
              className={`h-10 rounded-lg px-3 text-sm ${s.low ? "bg-warn-bg text-warn-ink" : "border border-line"}`}
            >
              {s.low ? "Low ✓ (undo)" : "Mark low"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
