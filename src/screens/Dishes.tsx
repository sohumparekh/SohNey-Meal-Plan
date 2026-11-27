import { Link } from "react-router-dom";
import { PageTitle } from "@/components/ui";
import { Stagger } from "@/ui/glass";
import { DishLibrary } from "@/components/DishLibrary";
import { getPlannerData } from "@/data/repo";
import { useLive } from "./view";

export function DishesScreen() {
  const data = useLive(getPlannerData);
  if (!data) return null;
  const dishes = Object.values(data.dishes)
    .map((d) => ({ id: d.id, nameEn: d.nameEn, nameCook: d.nameCook, slots: d.slots, cuisine: d.cuisine, effort: d.effort, active: d.active !== false, rating: d.rating ?? 0, prep: !!d.prepAhead, egg: d.ingredients.some((i) => i.ingredientId === "eggs") }))
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  return (
    <Stagger className="space-y-4">
      <PageTitle
        sub={`${dishes.filter((d) => d.active).length} in rotation`}
        title="Dishes"
        right={<Link to="/dishes/new" className="btn-brand mb-1 flex h-10 items-center rounded-full px-4 text-[14px] font-bold">+ Add</Link>}
      />
      <DishLibrary dishes={dishes} />
    </Stagger>
  );
}
