import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPlannerData, saveDish } from "@/data/repo";
import { buildClaudePrompt, parseDraft } from "@/lib/dishImport";
import { isStaplesOnly } from "@/lib/core/shelf";
import type { Cuisine } from "@/lib/seed/dishes";
import type { Dish, Ingredient, PlannerData, Slot } from "@/lib/core/types";

const CUISINES: Cuisine[] = ["Gujarati", "Maharashtrian", "Punjabi", "South Indian", "Indo-Chinese", "Asian noodles", "Chaat & street", "Continental"];
import { copyText, readClipboard } from "@/native/device";
import { useLive } from "./view";
import { Segmented } from "@/ui/glass";

type Draft = { dish: Dish; newIngredients: Ingredient[]; dropped: string[] };
const input = "field mt-1";
const SLOTS: Slot[] = ["breakfast", "lunch", "dinner"];

export function AddDishScreen() {
  const data = useLive(getPlannerData);
  const [mode, setMode] = useState<"claude" | "manual">("claude");
  const [draft, setDraft] = useState<Draft | null>(null);
  if (!data) return null;
  return (
    <div className="space-y-4">
      <Link to="/dishes" className="inline-block pt-1 text-[15px] font-semibold text-brand">‹ Dishes</Link>
      <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.035em]">Add a dish</h1>
      {draft ? (
        <Preview data={data} draft={draft} onBack={() => setDraft(null)} />
      ) : (
        <>
          <Segmented value={mode} onChange={setMode} options={[{ value: "claude", label: "✨ Add with Claude" }, { value: "manual", label: "Type it in" }]} />
          {mode === "claude" ? <WithClaude data={data} onDraft={setDraft} /> : <Manual data={data} onDraft={setDraft} />}
        </>
      )}
    </div>
  );
}

function WithClaude({ data, onDraft }: { data: PlannerData; onDraft: (d: Draft) => void }) {
  const [request, setRequest] = useState("");
  const [copied, setCopied] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const check = (text: string) => {
    setError(null);
    try {
      onDraft(parseDraft(text, data));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="space-y-4">
      <section className="glass space-y-2 rounded-[26px] p-4">
        <h2 className="font-semibold">1. What dish?</h2>
        <input value={request} onChange={(e) => setRequest(e.target.value)} placeholder="Dish name, or paste an Instagram/YouTube link" className={input} />
        <button
          disabled={!request.trim()}
          onClick={async () => { await copyText(buildClaudePrompt(request.trim(), data)); setCopied(true); }}
          className="btn-brand h-[54px] w-full rounded-[20px] font-semibold  disabled:opacity-50"
        >
          {copied ? "Copied ✓ Copy again" : "Copy prompt for Claude"}
        </button>
      </section>
      <section className="glass space-y-2 rounded-[26px] p-4">
        <h2 className="font-semibold">2. Ask Claude</h2>
        <p className="text-sm text-muted">Open the Claude app on the phone, start a new chat, paste and send. When it answers, long-press the reply and tap Copy, then come back here.</p>
      </section>
      <section className="glass space-y-2 rounded-[26px] p-4">
        <h2 className="font-semibold">3. Paste Claude&apos;s reply</h2>
        <button
          onClick={async () => { const t = await readClipboard(); setReply(t); if (t.trim()) check(t); }}
          className="btn-brand h-[54px] w-full rounded-[20px] font-semibold "
        >
          Paste from clipboard
        </button>
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="…or paste here" className="field font-mono text-xs" />
        {reply.trim() && <button onClick={() => check(reply)} className="btn-glass h-11 w-full rounded-[18px] font-semibold">Check reply</button>}
        {error && <p className="rounded-2xl p-3 text-sm text-warn-ink" style={{ background: "var(--warn-bg)" }}>{error}</p>}
      </section>
    </div>
  );
}

function Manual({ data, onDraft }: { data: PlannerData; onDraft: (d: Draft) => void }) {
  const [nameEn, setNameEn] = useState("");
  const [nameCook, setNameCook] = useState("");
  const [slots, setSlots] = useState<Slot[]>(["dinner"]);
  const [cuisine, setCuisine] = useState<Cuisine>("Gujarati");
  const [effort, setEffort] = useState<"quick" | "medium" | "long">("medium");
  const [rows, setRows] = useState<{ ingredientId: string; qty: string; optional: boolean }[]>([{ ingredientId: "", qty: "", optional: false }]);
  const [prepText, setPrepText] = useState("");
  const [prepHours, setPrepHours] = useState("10");
  const [planBId, setPlanBId] = useState("dal_khichdi");
  const ingredients = useMemo(() => Object.values(data.ingredients).sort((a, b) => a.nameEn.localeCompare(b.nameEn)), [data]);
  const planBs = useMemo(
    () => Object.values(data.dishes).filter((d) => isStaplesOnly(d, data.ingredients) && !d.prepAhead && d.slots.some((s) => slots.includes(s))).sort((a, b) => a.nameEn.localeCompare(b.nameEn)),
    [data, slots],
  );
  const valid = nameEn.trim() && slots.length && rows.some((r) => r.ingredientId && Number(r.qty) > 0);

  const build = () => {
    const hasEggs = rows.some((r) => r.ingredientId === "eggs" && Number(r.qty) > 0);
    let id = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "dish";
    while (data.dishes[id]) id = `${id}_2`;
    onDraft({
      dish: {
        id, nameEn: nameEn.trim(), nameCook: nameCook.trim() || nameEn.trim(), slots: hasEggs ? ["breakfast"] : slots, cuisine, effort,
        kind: "other",
        ingredients: rows.filter((r) => r.ingredientId && Number(r.qty) > 0).map((r) => ({ ingredientId: r.ingredientId, qty: Number(r.qty), optional: r.optional })),
        prepAhead: prepText.trim() ? { en: prepText.trim(), cook: prepText.trim(), leadHours: Number(prepHours) || 10 } : undefined,
        planBId: planBs.find((p) => p.id === planBId) ? planBId : planBs[0]?.id ?? "dal_khichdi",
        active: true, rating: 0, lastCookedAt: null,
        // eggs: breakfast only, quantities for the egg eater alone, egg-free dish for the other
        ...(hasEggs ? { forOne: true, neyomiAltId: "masala_paratha" } : {}),
      },
      newIngredients: [],
      dropped: [],
    });
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Dish name<input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={input} placeholder="Methi Malai Paneer + Roti" /></label>
      <label className="block text-sm font-medium">What the cook calls it<input value={nameCook} onChange={(e) => setNameCook(e.target.value)} className={input} placeholder="Methi malai paneer, roti" /></label>
      <div className="flex gap-2">
        {SLOTS.map((s) => (
          <button key={s} onClick={() => setSlots(slots.includes(s) ? slots.filter((x) => x !== s) : [...slots, s])} className={`h-11 flex-1 rounded-2xl text-sm font-semibold capitalize ${slots.includes(s) ? "btn-brand" : "btn-glass"}`}>{s}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm font-medium">Cuisine
          <select value={cuisine} onChange={(e) => setCuisine(e.target.value as Cuisine)} className={input}>{CUISINES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="block text-sm font-medium">Effort
          <select value={effort} onChange={(e) => setEffort(e.target.value as typeof effort)} className={input}>
            <option value="quick">Quick</option><option value="medium">Medium</option><option value="long">Long (weekends)</option>
          </select>
        </label>
      </div>
      <div className="glass space-y-2 rounded-[26px] p-3">
        <h3 className="font-semibold">Ingredients for 2</h3>
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <select value={r.ingredientId} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, ingredientId: e.target.value } : x)))} className="field !h-11 min-w-0 flex-1 !px-2 text-sm">
              <option value="">Choose…</option>
              {ingredients.map((g) => <option key={g.id} value={g.id}>{g.nameEn} ({g.unit})</option>)}
            </select>
            <input value={r.qty} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} inputMode="decimal" placeholder="qty" className="field !h-11 !w-16 !px-2 text-right" />
            <button aria-label="Remove" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="btn-glass h-11 w-10 rounded-xl">×</button>
          </div>
        ))}
        <button onClick={() => setRows([...rows, { ingredientId: "", qty: "", optional: false }])} className="h-10 w-full rounded-xl border border-dashed border-[var(--faint)] text-sm font-semibold text-muted">+ Ingredient</button>
      </div>
      <label className="block text-sm font-medium">Prep the day before (optional)<input value={prepText} onChange={(e) => setPrepText(e.target.value)} className={input} placeholder="1 katori chole paani mein bhigo dena" /></label>
      {prepText.trim() && <label className="block text-sm font-medium">Start how many hours before the meal?<input value={prepHours} onChange={(e) => setPrepHours(e.target.value)} inputMode="numeric" className={input} /></label>}
      <label className="block text-sm font-medium">Plan B (needs only staples)
        <select value={planBId} onChange={(e) => setPlanBId(e.target.value)} className={input}>
          {planBs.map((p) => <option key={p.id} value={p.id}>{p.nameEn}</option>)}
        </select>
      </label>
      <button disabled={!valid} onClick={build} className="btn-brand h-[54px] w-full rounded-[20px] text-lg font-semibold  disabled:opacity-50">Preview</button>
    </div>
  );
}

function Preview({ data, draft, onBack }: { data: PlannerData; draft: Draft; onBack: () => void }) {
  const navigate = useNavigate();
  const d = draft.dish;
  const name = (id: string) => data.ingredients[id]?.nameEn ?? draft.newIngredients.find((n) => n.id === id)?.nameEn ?? id;
  const unit = (id: string) => data.ingredients[id]?.unit ?? draft.newIngredients.find((n) => n.id === id)?.unit ?? "";
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-[26px] p-4">
        <h2 className="text-xl font-bold">{d.nameEn}</h2>
        <p className="text-sm text-muted">Cook calls it: {d.nameCook}{d.nameCookHi ? ` · ${d.nameCookHi}` : ""}</p>
        <p className="text-sm text-muted">{d.slots.join(", ")} · {d.cuisine} · {d.effort} · Plan B: {data.dishes[d.planBId]?.nameEn}</p>
        <ul className="mt-3 list-disc pl-5 text-sm">
          {d.ingredients.map((i) => <li key={i.ingredientId}>{name(i.ingredientId)}: {i.qty} {unit(i.ingredientId)}{i.optional ? " (garnish)" : ""}</li>)}
        </ul>
        {draft.newIngredients.length > 0 && <p className="mt-2 text-xs text-muted">New to the catalogue: {draft.newIngredients.map((n) => n.nameEn).join(", ")}</p>}
        {draft.dropped.length > 0 && <p className="mt-2 text-xs text-warn-ink">Left out (unknown): {draft.dropped.join(", ")}</p>}
        {d.prepAhead && <p className="mt-2 rounded-2xl bg-white/35 p-2 text-sm">★ Prep: {d.prepAhead.en} ({d.prepAhead.leadHours} h before)</p>}
        {d.recipeCook && <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-white/35 p-2 font-sans text-sm">{d.recipeCook}</pre>}
      </div>
      <button onClick={async () => { await saveDish(d, draft.newIngredients); navigate(`/dishes/${d.id}`); }} className="btn-brand h-[54px] w-full rounded-[20px] text-lg font-semibold ">Save dish</button>
      <button onClick={onBack} className="h-11 w-full text-sm font-semibold text-muted">Back</button>
    </div>
  );
}
