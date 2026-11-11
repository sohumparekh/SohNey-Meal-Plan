import { Link } from "react-router-dom";
import { DishLibrary } from "@/components/DishLibrary";
import { getPlannerData } from "@/data/repo";
import { useLive } from "./view";

export function DishesScreen() {
  const data = useLive(getPlannerData);
  if (!data) return null;
  const dishes = Object.values(data.dishes)
    .map((d) => ({ id: d.id, nameEn: d.nameEn, nameCook: d.nameCook, slots: d.slots, cuisine: d.cuisine, effort: d.effort, active: d.active !== false, rating: d.rating ?? 0, prep: !!d.prepAhead }))
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  return (
    <div className="space-y-4 pb-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dishes</h1>
        <Link to="/dishes/new" className="flex h-11 items-center rounded-xl bg-brand px-4 font-semibold text-brand-ink">+ Add dish</Link>
      </header>
      <DishLibrary dishes={dishes} />
    </div>
  );
}
