import { useEffect, useMemo, useState } from "react";
import { suggestionsFor, swapMeal } from "@/data/repo";
import { SLOT_LABEL } from "./ui";

type Suggestion = Awaited<ReturnType<typeof suggestionsFor>>[number];
export type DishLite = { id: string; nameEn: string; nameCook: string; slots: string[] };

export function SwapSheet({
  date, slot, dateLabel, allDishes, onClose,
}: { date: string; slot: "breakfast" | "lunch" | "dinner"; dateLabel: string; allDishes: DishLite[]; onClose: () => void }) {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    suggestionsFor(date, slot).then(setItems).catch(() => setItems([]));
  }, [date, slot]);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return allDishes
      .filter((d) => d.slots.includes(slot) && (d.nameEn.toLowerCase().includes(t) || d.nameCook.toLowerCase().includes(t)))
      .slice(0, 8);
  }, [q, allDishes, slot]);

  const pick = async (id: string) => {
    setBusy(true);
    await swapMeal(date, slot, id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="mx-auto max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <h2 className="text-lg font-bold">Swap {SLOT_LABEL[slot].toLowerCase()}</h2>
        <p className="mb-3 text-sm text-muted">{dateLabel}. Best fits first.</p>
        {items === null && <p className="py-6 text-center text-muted">Finding options…</p>}
        <ul className="space-y-2">
          {items?.map((s) => (
            <li key={s.id}>
              <button disabled={busy} onClick={() => pick(s.id)} className="w-full rounded-xl border border-line p-3 text-left active:bg-soft disabled:opacity-50">
                <div className="font-semibold">{s.nameEn}</div>
                <div className="text-xs text-muted">{s.cuisine} · {s.effort} · {s.reason}</div>
              </button>
            </li>
          ))}
        </ul>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Or search all dishes…" className="mt-4 h-12 w-full rounded-xl border border-line bg-bg px-4" />
        <ul className="mt-2 space-y-1">
          {matches.map((d) => (
            <li key={d.id}>
              <button disabled={busy} onClick={() => pick(d.id)} className="w-full rounded-lg px-3 py-3 text-left active:bg-soft">
                {d.nameEn} <span className="text-xs text-muted">({d.nameCook})</span>
              </button>
            </li>
          ))}
        </ul>
        <button onClick={onClose} className="mt-4 h-12 w-full rounded-xl border border-line font-medium">Cancel</button>
      </div>
    </div>
  );
}
