import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { haptic } from "@/native/haptics";
import { Glass, Segmented, rise } from "@/ui/glass";

export interface DishRow { id: string; nameEn: string; nameCook: string; slots: string[]; cuisine: string; effort: string; active: boolean; rating: number; prep: boolean; egg: boolean }

type F = "all" | "breakfast" | "lunch" | "dinner" | "off";

export function DishLibrary({ dishes }: { dishes: DishRow[] }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<F>("all");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return dishes.filter(
      (d) =>
        (f === "off" ? !d.active : d.active && (f === "all" || d.slots.includes(f))) &&
        (!t || d.nameEn.toLowerCase().includes(t) || d.nameCook.toLowerCase().includes(t) || d.cuisine.toLowerCase().includes(t)),
    );
  }, [q, f, dishes]);
  return (
    <div className="space-y-3">
      <motion.div variants={rise} className="relative">
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes or cuisine" className="field glass !pl-11" />
      </motion.div>
      <motion.div variants={rise}>
        <Segmented<F>
          value={f}
          onChange={setF}
          options={[
            { value: "all", label: "All" },
            { value: "breakfast", label: "B'fast" },
            { value: "lunch", label: "Lunch" },
            { value: "dinner", label: "Dinner" },
            { value: "off", label: "Off" },
          ]}
        />
      </motion.div>
      <p className="px-1 text-[12px] font-semibold text-muted">{shown.length} dishes</p>
      <Glass variants={rise} className="overflow-hidden p-1.5">
        <ul className="relative z-[2]">
          {shown.map((d) => (
            <li key={d.id}>
              <Link to={`/dishes/${d.id}`} onClick={() => haptic.tap()} className="flex min-h-[58px] items-center gap-3 rounded-[18px] px-3 py-2 active:bg-white/30">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold leading-tight tracking-tight">{d.egg && "🍳 "}{d.nameEn}{d.prep && <span className="text-brand"> ★</span>}</div>
                  <div className="mt-0.5 truncate text-[12px] text-muted">{d.cuisine} · {d.effort} · {d.slots.join(", ")}</div>
                </div>
                {d.rating !== 0 && <span className="text-[12px] font-semibold">{d.rating > 0 ? `👍 ${d.rating}` : `👎 ${-d.rating}`}</span>}
                <span className="text-[18px] text-[var(--faint)]">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </Glass>
    </div>
  );
}
