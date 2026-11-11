// Claude API: used only to draft new dishes (from a link or a name, including the
// cook-language name and a short recipe) and to read free-text cook replies.
// Everything else in the app is deterministic code.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { isStaplesOnly } from "./core/shelf";
import type { Dish, Ingredient, PlannerData } from "./core/types";

const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";

function client() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic();
}

// ------------------------------------------------------------ reading a link

export interface LinkInfo { ok: boolean; title?: string; description?: string }

function meta(html: string, prop: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i");
  return (html.match(re)?.[1] ?? html.match(re2)?.[1])?.trim();
}
const decode = (s?: string) =>
  s?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export async function readLink(url: string): Promise<LinkInfo> {
  const signal = AbortSignal.timeout(8000);
  try {
    if (/youtube\.com|youtu\.be/.test(url)) {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { signal });
      if (r.ok) {
        const j = (await r.json()) as { title?: string; author_name?: string };
        if (j.title) return { ok: true, title: j.title, description: j.author_name ? `by ${j.author_name}` : undefined };
      }
    }
    const r = await fetch(url, { signal, headers: { "user-agent": "Mozilla/5.0 (compatible; recipe-reader)" } });
    if (!r.ok) return { ok: false };
    const html = (await r.text()).slice(0, 300_000);
    const title = decode(meta(html, "og:title") ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim());
    const description = decode(meta(html, "og:description") ?? meta(html, "description"));
    const useful = (title && !/^(instagram|login|youtube)$/i.test(title)) || (description && description.length > 20);
    return useful ? { ok: true, title, description } : { ok: false };
  } catch {
    return { ok: false };
  }
}

// ------------------------------------------------------------ drafting a dish

const DishDraft = z.object({
  nameEn: z.string(),
  nameCook: z.string(),
  slots: z.array(z.enum(["breakfast", "lunch", "dinner"])),
  cuisine: z.enum(["Gujarati", "Maharashtrian", "Punjabi", "South Indian", "Indo-Chinese", "Asian noodles", "Chaat & street", "Continental"]),
  effort: z.enum(["quick", "medium", "long"]),
  kind: z.enum(["roti_sabzi", "dal_rice", "other"]),
  ingredients: z.array(z.object({ ingredientId: z.string(), qty: z.number(), optional: z.boolean() })),
  newIngredients: z.array(
    z.object({
      id: z.string(),
      nameEn: z.string(),
      nameCook: z.string(),
      category: z.enum(["staple", "fresh", "specialty"]),
      source: z.enum(["grocer", "blinkit", "either"]),
      unit: z.enum(["g", "ml", "pc", "bunch"]),
      pack: z.number(),
      packLabel: z.string(),
      shelfLifeDays: z.number(),
    }),
  ),
  prepAhead: z.object({ en: z.string(), cook: z.string(), leadHours: z.number() }).nullable(),
  planBId: z.string(),
  recipeCook: z.string(),
  vegetarian: z.boolean(),
});
export type DishDraftT = z.infer<typeof DishDraft>;

const SYSTEM = `You add dishes to the meal planner of a vegetarian Gujarati household in Mumbai (2 people).
Their cook reads simple Hindi written in English letters (Hinglish), e.g. "Kobi ki sabzi, roti", "1 katori rajma paani mein bhigo dena".
Rules:
- Strictly vegetarian (no meat, fish, egg). If the dish is not vegetarian, set vegetarian=false and make a vegetarian version.
- Quantities are for 2 people, in the ingredient's unit (g, ml, pc or bunch).
- Use ingredient ids from the catalogue whenever one fits. Only add a newIngredients entry (snake_case id) if nothing fits.
- Mark pure garnish (coriander, mint, spring onion on top) as optional.
- nameCook: the short name the cook would use. recipeCook: 3 to 6 short numbered lines in simple Hinglish.
- prepAhead only if something must be done many hours before (soaking, sprouting, fermenting, marinating overnight); leadHours = hours before the meal it must start. Its "cook" text is just the action in Hinglish, e.g. "1 katori chole paani mein bhigo dena".
- planBId must be one of the given Plan B ids, the closest fit for the same meal.
- effort: quick (<30 min), medium, long (>1.5 h or very fiddly).`;

export async function draftDish(input: { name?: string; link?: LinkInfo; url?: string }, data: PlannerData) {
  const catalogue = Object.values(data.ingredients).map((i) => `${i.id} | ${i.nameEn} | ${i.unit}`).join("\n");
  const planBs = Object.values(data.dishes)
    .filter((d) => isStaplesOnly(d, data.ingredients) && !d.prepAhead)
    .map((d) => `${d.id} | ${d.nameEn} | ${d.slots.join("/")}`)
    .join("\n");
  const about = [
    input.name && `Dish: ${input.name}`,
    input.url && `Link: ${input.url}`,
    input.link?.title && `Page title: ${input.link.title}`,
    input.link?.description && `Page description: ${input.link.description}`,
  ].filter(Boolean).join("\n");

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "low", format: zodOutputFormat(DishDraft) },
    system: [{ type: "text", text: SYSTEM }, { type: "text", text: `Ingredient catalogue (id | name | unit):\n${catalogue}\n\nPlan B ids:\n${planBs}`, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `Create the dish entry.\n${about}` }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error("Could not draft this dish. Try typing the dish name.");
  return sanitize(response.parsed_output, data);
}

/** Make the draft safe to save: known ids only, sensible numbers. */
export function sanitize(d: DishDraftT, data: PlannerData): { dish: Dish; newIngredients: Ingredient[] } {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
  const newIngredients: Ingredient[] = d.newIngredients
    .filter((n) => !data.ingredients[slug(n.id)])
    .map((n) => ({
      ...n, id: slug(n.id), pack: n.pack > 0 ? n.pack : 1, shelfLifeDays: Math.max(1, Math.round(n.shelfLifeDays)),
      ...(n.category === "staple" ? { restockDays: 30, restockQty: n.packLabel } : {}),
    }));
  const known = new Set([...Object.keys(data.ingredients), ...newIngredients.map((n) => n.id)]);
  const ingredients = d.ingredients
    .map((i) => ({ ...i, ingredientId: slug(i.ingredientId) }))
    .filter((i) => known.has(i.ingredientId) && i.qty > 0);
  let id = slug(d.nameEn) || "dish";
  while (data.dishes[id]) id = `${id}_2`;
  const planB = data.dishes[d.planBId] && isStaplesOnly(data.dishes[d.planBId], data.ingredients) ? d.planBId : d.slots.includes("breakfast") ? "upma" : "dal_khichdi";
  return {
    dish: {
      id, nameEn: d.nameEn, nameCook: d.nameCook, slots: d.slots.length ? d.slots : ["dinner"], cuisine: d.cuisine,
      effort: d.effort, kind: d.kind, ingredients,
      prepAhead: d.prepAhead && d.prepAhead.leadHours >= 4 ? d.prepAhead : undefined,
      planBId: planB, recipeCook: d.recipeCook, active: true, rating: 0, lastCookedAt: null,
    },
    newIngredients,
  };
}

// ------------------------------------------------------------ free-text cook replies

const ReplyIntent = z.object({
  intent: z.enum(["ok", "plan_b", "missing", "other"]),
  missingIngredientIds: z.array(z.string()),
  summaryEn: z.string(),
});

export async function readCookReply(text: string, ingredients: Record<string, Ingredient>) {
  const catalogue = Object.values(ingredients).map((i) => `${i.id} | ${i.nameEn} | ${i.nameCook}`).join("\n");
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low", format: zodOutputFormat(ReplyIntent) },
    system: [
      { type: "text", text: "The household cook replied on WhatsApp (Hindi, Marathi, English or a mix, possibly in Devanagari). Classify the reply. 'missing' = an ingredient ran out or is not at home; list matching ingredient ids from the catalogue. summaryEn = one short English sentence for the owners." },
      { type: "text", text: `Catalogue (id | English | Hindi):\n${catalogue}`, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: text }],
  });
  const out = response.parsed_output;
  if (!out) return null;
  return { ...out, missingIngredientIds: out.missingIngredientIds.filter((id) => ingredients[id]) };
}
