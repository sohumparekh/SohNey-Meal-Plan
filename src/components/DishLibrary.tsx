import { Link } from "react-router-dom";
import { useMemo, useState } from "react";

export interface DishRow { id: string; nameEn: string; nameCook: string; slots: string[]; cuisine: string; effort: string; active: boolean; rating: number; prep: boolean }

const FILTERS = ["all", "breakfast", "lunch", "dinner", "inactive"] as const;

export function DishLibrary({ dishes }: { dishes: DishRow[] }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<(typeof FILTERS)[number]>("all");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return dishes.filter((d) =>
      (f === "inactive" ? !d.active : d.active && (f === "all" || d.slots.includes(f))) &&
      (!t || d.nameEn.toLowerCase().includes(t) || d.nameCook.toLowerCase().includes(t) || d.cuisine.toLowerCase().includes(t)),
    );
  }, [q, f, dishes]);
  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes or cuisine…" className="h-12 w-full rounded-xl border border-line bg-card px-4" />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((x) => (
          <button key={x} onClick={() => setF(x)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium capitalize ${f === x ? "bg-brand text-brand-ink" : "border border-line bg-card"}`}>
            {x}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{shown.length} dishes</p>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
        {shown.map((d) => (
          <li key={d.id}>
            <Link to={`/dishes/${d.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 active:bg-soft">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{d.nameEn}{d.prep && " ★"}</div>
                <div className="truncate text-xs text-muted">{d.cuisine} · {d.effort} · {d.slots.join(", ")}</div>
              </div>
              {d.rating !== 0 && <span className="text-xs">{d.rating > 0 ? `👍${d.rating}` : `👎${-d.rating}`}</span>}
              <span className="text-muted">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
