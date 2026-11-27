import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { reportStapleLow, setPickupDone, setTick } from "@/data/repo";
import { copyText, openExternal } from "@/native/device";
import { haptic } from "@/native/haptics";
import { Check, Glass, Press, rise, spring } from "@/ui/glass";

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

export function Progress({ done, total }: { done: number; total: number }) {
  const r = 15, c = 2 * Math.PI * r, f = total ? done / total : 1;
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
        <motion.circle cx="18" cy="18" r={r} fill="none" stroke="url(#pg)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} animate={{ strokeDashoffset: c * (1 - f) }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        <defs><linearGradient id="pg" x1="0" x2="1"><stop offset="0" stopColor="#3ee07d" /><stop offset="1" stopColor="#17a34a" /></linearGradient></defs>
      </svg>
      <span className="text-[13px] font-semibold text-muted">{done === total ? "All done" : `${done} of ${total}`}</span>
    </div>
  );
}

export function ShoppingList({ weekStart, list, items, emptyText }: { weekStart: string; list: string; items: ItemView[]; emptyText: string }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!items.length)
    return (
      <Glass variants={rise} className="p-8 text-center text-[15px] text-muted">
        {emptyText}
      </Glass>
    );
  const sorted = [...items].sort((a, b) => Number(a.ticked) - Number(b.ticked));
  return (
    <Glass variants={rise} className="overflow-hidden p-1.5">
      <ul className="relative z-[2]">
        <AnimatePresence initial={false}>
          {sorted.map((i) => (
            <motion.li key={i.ingredientId} layout transition={spring} className="flex items-center gap-3 rounded-[18px] px-2.5 py-1">
              <Check checked={i.ticked} label={i.ticked ? `Untick ${i.name}` : `Tick ${i.name}`} onToggle={() => setTick(weekStart, list, i.ingredientId, !i.ticked)} />
              <button className="min-h-[52px] min-w-0 flex-1 py-1.5 text-left" onClick={() => { haptic.select(); setOpen(open === i.ingredientId ? null : i.ingredientId); }}>
                <div className={`text-[16px] font-semibold leading-tight tracking-tight transition-colors ${i.ticked ? "text-[var(--faint)] line-through" : ""}`}>
                  {i.name} <span className="text-[12px] font-medium text-muted">{i.nameCook.split(" / ")[0]}</span>
                </div>
                {(i.note || open === i.ingredientId) && (
                  <div className="mt-0.5 text-[12px] text-muted">
                    {i.note}
                    <AnimatePresence>
                      {open === i.ingredientId && i.usedFor.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          For: {i.usedFor.join(" · ")}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </button>
              <span className={`shrink-0 text-right text-[14px] font-bold tabular-nums ${i.ticked ? "text-[var(--faint)]" : ""}`}>{i.qty}</span>
              {i.searchUrl && (
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => { haptic.tap(); openExternal(i.searchUrl!); }} className="btn-glass flex h-9 shrink-0 items-center rounded-xl px-2.5 text-[12px] font-semibold">
                  Find ↗
                </motion.button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </Glass>
  );
}

export function PickupDone({ weekStart, done }: { weekStart: string; done: boolean }) {
  return (
    <Press variant={done ? "glass" : "brand"} size="md" className="w-full" haptics={done ? "tap" : "success"} onClick={() => setPickupDone(weekStart, !done)}>
      {done ? "Pickup marked done · undo" : "Pickup done · move missing items to top-up"}
    </Press>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Press size="md" className="flex-1" onClick={async () => { await copyText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      {copied ? "Copied ✓" : label}
    </Press>
  );
}

export function ReportLow({ staples }: { staples: { id: string; name: string; low: boolean }[] }) {
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const shown = staples.filter((s) => s.low || (t && s.name.toLowerCase().includes(t))).slice(0, 12);
  return (
    <Glass variants={rise} className="p-4">
      <div className="relative z-[2]">
        <h2 className="text-[17px] font-bold tracking-tight">Running low?</h2>
        <p className="mb-3 text-[13px] text-muted">Search a staple and mark it. It goes on the next list.</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="atta, ghee, jeera…" className="field" />
        <ul className="mt-2">
          {shown.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-1.5">
              <span className="font-medium">{s.name}</span>
              <Press size="sm" variant={s.low ? "brand" : "glass"} haptics="select" onClick={() => reportStapleLow(s.id, !s.low)}>
                {s.low ? "Low ✓" : "Mark low"}
              </Press>
            </li>
          ))}
        </ul>
      </div>
    </Glass>
  );
}
