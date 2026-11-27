import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { altSuggestions, suggestionsFor, swapMeal } from "@/data/repo";
import type { Meal } from "@/lib/core/types";
import { haptic } from "@/native/haptics";
import { Sheet, spring } from "@/ui/glass";
import { SLOT_LABEL } from "./ui";

type Suggestion = Awaited<ReturnType<typeof suggestionsFor>>[number];
export type DishLite = { id: string; nameEn: string; nameCook: string; slots: string[]; egg?: boolean };

export function SwapSheet({
  open, date, slot, mode = "main", forWho, dateLabel, allDishes, onClose, onPicked, snapshot,
}: {
  open: boolean; date: string; slot: "breakfast" | "lunch" | "dinner"; mode?: "main" | "alt"; forWho?: string;
  dateLabel: string; allDishes: DishLite[]; onClose: () => void;
  onPicked?: (id: string, name: string, before?: Meal) => void | Promise<void>;
  snapshot?: () => Promise<Meal | undefined>;
}) {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    setQ("");
    (mode === "alt" ? altSuggestions(date).then((xs) => xs.slice(0, 6)) : suggestionsFor(date, slot)).then(setItems).catch(() => setItems([]));
  }, [open, date, slot, mode]);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return allDishes
      .filter((d) => d.slots.includes(slot) && (mode !== "alt" || !d.egg) && (d.nameEn.toLowerCase().includes(t) || d.nameCook.toLowerCase().includes(t)))
      .slice(0, 8);
  }, [q, allDishes, slot, mode]);

  const pick = async (id: string, name: string) => {
    haptic.success();
    setBusy(true);
    const before = snapshot ? await snapshot() : undefined;
    if (mode === "main") await swapMeal(date, slot, id);
    await onPicked?.(id, name, before);
    setBusy(false);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-[22px] font-extrabold tracking-[-0.03em]">
            {forWho ? `${forWho}'s ${SLOT_LABEL[slot].toLowerCase()}` : `Swap ${SLOT_LABEL[slot].toLowerCase()}`}
          </h2>
          <p className="text-[13px] text-muted">{dateLabel} · {mode === "alt" ? "egg-free options" : "best fits first"}</p>
        </div>
      }
    >
      <div className="space-y-2 pb-2 pt-1">
        {items === null &&
          [0, 1, 2].map((i) => (
            <motion.div key={i} className="h-[62px] rounded-[20px] bg-white/30 dark:bg-white/5" animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 }} />
          ))}
        {items?.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...spring, delay: i * 0.04 }}
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            onClick={() => pick(s.id, s.nameEn)}
            className="btn-glass w-full rounded-[20px] px-4 py-3 text-left disabled:opacity-50"
          >
            <div className="text-[16px] font-bold tracking-tight">{s.nameEn}</div>
            <div className="mt-0.5 text-[12px] text-muted">{[s.cuisine, s.effort, s.reason].filter(Boolean).join(" · ")}</div>
          </motion.button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Or search every dish…" className="field mt-3" />
        {matches.map((d) => (
          <motion.button
            key={d.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileTap={{ scale: 0.98 }}
            disabled={busy}
            onClick={() => pick(d.id, d.nameEn)}
            className="w-full rounded-2xl px-3 py-3 text-left active:bg-white/30"
          >
            <span className="font-semibold">{d.nameEn}</span> <span className="text-[12px] text-muted">{d.nameCook}</span>
          </motion.button>
        ))}
      </div>
    </Sheet>
  );
}
