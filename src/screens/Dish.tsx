import { Link, useParams } from "react-router-dom";
import { ActiveToggle } from "@/components/ActiveToggle";
import { Card } from "@/components/ui";
import { getPlannerData } from "@/data/repo";
import { cookName } from "@/lib/core/cookMessages";
import { prettyDate } from "@/lib/core/dates";
import { useLive } from "./view";

export function DishScreen() {
  const { id = "" } = useParams();
  const data = useLive(getPlannerData);
  if (!data) return null;
  const d = data.dishes[id];
  if (!d) return <p className="py-10 text-center text-muted">Dish not found. <Link className="underline" to="/dishes">Back</Link></p>;
  const pb = data.dishes[d.planBId];
  const fresh: string[] = [], staple: string[] = [];
  for (const i of d.ingredients) {
    const ing = data.ingredients[i.ingredientId];
    if (!ing) continue;
    const line = `${ing.nameEn}: ${i.qty} ${ing.unit}${i.optional ? " (garnish)" : ""}`;
    (ing.category === "staple" ? staple : fresh).push(line);
  }
  return (
    <div className="space-y-4 pb-6">
      <Link to="/dishes" className="text-sm text-muted">‹ Dishes</Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{d.nameEn}</h1>
        <p className="text-muted">Cook sees: <b>{cookName(d, data.settings.cookLanguage)}</b></p>
        <p className="text-sm text-muted">{d.cuisine} · {d.effort} · {d.slots.join(", ")}{d.lastCookedAt ? ` · last made ${prettyDate(d.lastCookedAt)}` : ""}</p>
      </header>
      <Card>
        <h2 className="mb-1 font-semibold">To buy (for 2)</h2>
        {fresh.length ? <ul className="list-disc pl-5 text-sm">{fresh.map((l) => <li key={l}>{l}</li>)}</ul> : <p className="text-sm text-muted">Only staples.</p>}
        <h2 className="mb-1 mt-3 font-semibold">From the pantry</h2>
        <p className="text-sm text-muted">{staple.join(" · ")}</p>
      </Card>
      {d.prepAhead && <Card><h2 className="font-semibold">Prep ahead ★</h2><p className="text-sm">{d.prepAhead.en} ({d.prepAhead.leadHours} h before)</p><p className="text-sm text-muted">{d.prepAhead.cook}</p></Card>}
      <Card><h2 className="font-semibold">Plan B</h2><p className="text-sm">{pb ? `${pb.nameEn} (${pb.nameCook})` : d.planBId}</p></Card>
      {d.recipeCook && <Card><h2 className="font-semibold">Recipe for the cook</h2><pre className="whitespace-pre-wrap font-sans text-sm">{d.recipeCook}</pre></Card>}
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-semibold">In rotation</h2><p className="text-sm text-muted">Rating {d.rating ?? 0}. Turn off to stop it being planned or suggested.</p></div>
          <ActiveToggle id={d.id} active={d.active !== false} />
        </div>
      </Card>
    </div>
  );
}
