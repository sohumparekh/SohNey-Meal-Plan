"use client";
import { useState, useTransition } from "react";
import { draftDishAction, saveDishAction } from "@/app/actions";

type Draft = Extract<Awaited<ReturnType<typeof draftDishAction>>, { dish: unknown }>;

export function NewDish() {
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      setError(null);
      const r = await draftDishAction(input);
      if ("dish" in r) setDraft(r as Draft);
      else setError(r.error ?? "Something went wrong");
      if (r.needName) setInput("");
    });

  if (!draft)
    return (
      <div className="space-y-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Link or dish name, e.g. Methi malai paneer"
          className="h-14 w-full rounded-xl border border-line bg-card px-4 text-base"
        />
        {error && <p className="rounded-lg bg-warn-bg p-3 text-sm text-warn-ink">{error}</p>}
        <button disabled={pending || !input.trim()} onClick={run} className="h-14 w-full rounded-xl bg-brand text-lg font-semibold text-brand-ink disabled:opacity-50">
          {pending ? "Drafting… (10-20 s)" : "Draft dish"}
        </button>
      </div>
    );

  const d = draft.dish;
  const set = (patch: Partial<typeof d>) => setDraft({ ...draft, dish: { ...d, ...patch } });
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Name<input value={d.nameEn} onChange={(e) => set({ nameEn: e.target.value })} className="mt-1 h-12 w-full rounded-xl border border-line bg-card px-3" /></label>
      <label className="block text-sm font-medium">Cook calls it<input value={d.nameCook} onChange={(e) => set({ nameCook: e.target.value })} className="mt-1 h-12 w-full rounded-xl border border-line bg-card px-3" /></label>
      <div className="flex gap-2">
        {(["breakfast", "lunch", "dinner"] as const).map((s) => (
          <button key={s} onClick={() => set({ slots: d.slots.includes(s) ? d.slots.filter((x) => x !== s) : [...d.slots, s] })}
            className={`h-11 flex-1 rounded-xl text-sm font-medium capitalize ${d.slots.includes(s) ? "bg-brand text-brand-ink" : "border border-line"}`}>{s}</button>
        ))}
      </div>
      <p className="text-sm text-muted">{d.cuisine} · {d.effort} · Plan B: {draft.planBName}</p>
      <div className="rounded-xl border border-line bg-card p-3">
        <h3 className="mb-1 font-semibold">Ingredients for 2</h3>
        <ul className="space-y-1 text-sm">
          {d.ingredients.map((i, idx) => (
            <li key={idx} className="flex items-center justify-between gap-2">
              <span>{draft.ingredientNames[i.ingredientId] ?? i.ingredientId}{i.optional ? " (garnish)" : ""}</span>
              <span className="flex items-center gap-2">
                <input type="number" value={i.qty} onChange={(e) => set({ ingredients: d.ingredients.map((x, j) => (j === idx ? { ...x, qty: Number(e.target.value) } : x)) })} className="h-9 w-20 rounded-lg border border-line bg-bg px-2 text-right" />
                <button aria-label="Remove" onClick={() => set({ ingredients: d.ingredients.filter((_, j) => j !== idx) })} className="h-9 w-9 rounded-lg border border-line">×</button>
              </span>
            </li>
          ))}
        </ul>
        {draft.newIngredients.length > 0 && <p className="mt-2 text-xs text-muted">New to the catalogue: {draft.newIngredients.map((n) => n.nameEn).join(", ")}</p>}
      </div>
      {d.prepAhead && <p className="rounded-xl bg-soft p-3 text-sm">★ Prep ahead: {d.prepAhead.en}</p>}
      {d.recipeCook && <pre className="whitespace-pre-wrap rounded-xl bg-soft p-3 text-sm">{d.recipeCook}</pre>}
      <button disabled={pending || !d.slots.length} onClick={() => start(() => saveDishAction(d, draft.newIngredients, draft.sourceUrl))} className="h-14 w-full rounded-xl bg-brand text-lg font-semibold text-brand-ink disabled:opacity-50">
        {pending ? "Saving…" : "Save dish"}
      </button>
      <button onClick={() => setDraft(null)} className="h-11 w-full text-sm text-muted underline">Start over</button>
    </div>
  );
}
