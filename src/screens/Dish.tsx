import { Link, useParams } from "react-router-dom";
import { ActiveToggle } from "@/components/ActiveToggle";
import { Card, PageTitle } from "@/components/ui";
import { Stagger } from "@/ui/glass";
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
    <Stagger className="space-y-4">
      <Link to="/dishes" className="inline-block pt-1 text-[15px] font-semibold text-brand">‹ Dishes</Link>
      <PageTitle sub={`${d.cuisine} · ${d.effort} · ${d.slots.join(", ")}`} title={d.nameEn} />
      <p className="px-1 text-[14px] text-muted">
        Cook sees: <b className="text-ink">{cookName(d, data.settings.cookLanguage)}</b>
        {d.lastCookedAt ? ` · last made ${prettyDate(d.lastCookedAt)}` : ""}
        {d.forOne && ` · for ${data.settings.eggEater} only, with ${data.dishes[d.neyomiAltId ?? ""]?.nameEn ?? "an egg-free dish"} for ${data.settings.nonEggEater}`}
      </p>
      <Card>
        <h2 className="mb-1 font-bold">To buy ({d.forOne ? "for 1" : "for 2"})</h2>
        {fresh.length ? <ul className="list-disc pl-5 text-sm">{fresh.map((l) => <li key={l}>{l}</li>)}</ul> : <p className="text-sm text-muted">Only staples.</p>}
        <h2 className="mb-1 mt-3 font-bold">From the pantry</h2>
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
    </Stagger>
  );
}
