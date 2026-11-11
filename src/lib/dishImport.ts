// "Add with Claude" without an API key: the app builds a prompt (dish name or link + the
// exact JSON format), the user pastes it into the Claude app, then pastes the JSON reply
// back. This file builds the prompt and validates/cleans the reply before saving.
import { z } from "zod";
import { isStaplesOnly } from "./core/shelf";
import type { Dish, Ingredient, PlannerData } from "./core/types";

const CUISINES = ["Gujarati", "Maharashtrian", "Punjabi", "South Indian", "Indo-Chinese", "Asian noodles", "Chaat & street", "Continental"] as const;

export const DishDraft = z.object({
  nameEn: z.string().min(1),
  nameCook: z.string().min(1),
  nameCookHi: z.string().optional().nullable(),
  slots: z.array(z.enum(["breakfast", "lunch", "dinner"])).min(1),
  cuisine: z.enum(CUISINES),
  effort: z.enum(["quick", "medium", "long"]),
  kind: z.enum(["roti_sabzi", "dal_rice", "other"]),
  ingredients: z.array(z.object({ ingredientId: z.string(), qty: z.number().positive(), optional: z.boolean() })).min(1),
  newIngredients: z
    .array(
      z.object({
        id: z.string(),
        nameEn: z.string(),
        nameCook: z.string(),
        category: z.enum(["staple", "fresh", "specialty"]),
        source: z.enum(["grocer", "blinkit", "either"]),
        unit: z.enum(["g", "ml", "pc", "bunch"]),
        pack: z.number().positive(),
        packLabel: z.string(),
        shelfLifeDays: z.number().positive(),
      }),
    )
    .default([]),
  prepAhead: z.object({ en: z.string(), cook: z.string(), leadHours: z.number() }).nullable().optional(),
  planBId: z.string(),
  recipeCook: z.string().default(""),
});
export type DishDraftT = z.infer<typeof DishDraft>;

const EXAMPLE = {
  nameEn: "Methi Malai Paneer + Roti",
  nameCook: "Methi malai paneer, roti",
  nameCookHi: "मेथी मलाई पनीर, रोटी",
  slots: ["dinner"],
  cuisine: "Punjabi",
  effort: "medium",
  kind: "roti_sabzi",
  ingredients: [
    { ingredientId: "paneer", qty: 200, optional: false },
    { ingredientId: "methi", qty: 1, optional: false },
    { ingredientId: "coriander", qty: 0.25, optional: true },
  ],
  newIngredients: [],
  prepAhead: null,
  planBId: "aloo_matar",
  recipeCook: "1. Methi dho ke kaat lena\n2. ...",
};

/** The text copied to the clipboard for the Claude app. */
export function buildClaudePrompt(request: string, data: PlannerData) {
  const catalogue = Object.values(data.ingredients).map((i) => `${i.id} | ${i.nameEn} | ${i.unit}`).join("\n");
  const planBs = Object.values(data.dishes)
    .filter((d) => d.active !== false && isStaplesOnly(d, data.ingredients) && !d.prepAhead)
    .map((d) => `${d.id} | ${d.nameEn} | ${d.slots.join("/")}`)
    .join("\n");
  return `Please create a dish entry for my home meal-planner app. Reply with ONLY one JSON object, no other text.

Dish: ${request}

About us: vegetarian Gujarati household in Mumbai, 2 people. Our cook reads simple Hindi written in English letters (e.g. "Kobi ki sabzi, roti", "1 katori rajma paani mein bhigo dena").

Rules:
- Strictly vegetarian (no meat, fish or egg). If the dish isn't, make a vegetarian version.
- Quantities for 2 people, in the unit listed for that ingredient (g, ml, pc or bunch).
- Use ingredientId values from the catalogue below whenever one fits. Only if nothing fits, add it to "newIngredients" (snake_case id, category staple/fresh/specialty, source grocer/blinkit/either, shelfLifeDays in a Mumbai fridge) and use that id.
- Mark pure garnish (coriander, mint, spring onion on top) as optional: true.
- nameCook: the short name the cook would use, in Hinglish. nameCookHi: the same in Devanagari.
- slots: any of breakfast, lunch, dinner. cuisine: one of ${CUISINES.join(", ")}. effort: quick (under 30 min), medium, or long (over 1.5 h). kind: roti_sabzi, dal_rice or other.
- prepAhead: only if something must start many hours before (soaking, sprouting, fermenting). leadHours = hours before the meal. "cook" is just the action in Hinglish, e.g. "1 katori chole paani mein bhigo dena". Otherwise null.
- planBId: pick the closest match from the Plan B list below (same meal slot).
- recipeCook: 3 to 6 short numbered steps in simple Hinglish, separated by \\n.

Format (example):
${JSON.stringify(EXAMPLE, null, 2)}

Ingredient catalogue (id | name | unit):
${catalogue}

Plan B list (id | name | slots):
${planBs}`;
}

/** Pull the JSON object out of whatever was pasted (plain JSON, ```json fences, extra text). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{"), end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON found. Copy Claude's whole reply and paste it again.");
  return JSON.parse(body.slice(start, end + 1));
}

export function parseDraft(text: string, data: PlannerData) {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch (e) {
    throw new Error((e as Error).message.startsWith("No JSON") ? (e as Error).message : "That JSON could not be read. Copy Claude's whole reply again.");
  }
  const parsed = DishDraft.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(`The reply is missing or has a wrong "${first.path.join(".")}". Ask Claude to fix the JSON and paste again.`);
  }
  return sanitize(parsed.data, data);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);

/** Make a draft safe to save: known ids only, sensible numbers, a staples-only Plan B. */
export function sanitize(d: DishDraftT, data: PlannerData): { dish: Dish; newIngredients: Ingredient[]; dropped: string[] } {
  const newIngredients: Ingredient[] = d.newIngredients
    .filter((n) => !data.ingredients[slug(n.id)])
    .map((n) => ({
      ...n,
      id: slug(n.id),
      shelfLifeDays: Math.max(1, Math.round(n.shelfLifeDays)),
      ...(n.category === "staple" ? { restockDays: 30, restockQty: n.packLabel } : {}),
    }));
  const known = new Set([...Object.keys(data.ingredients), ...newIngredients.map((n) => n.id)]);
  const dropped: string[] = [];
  const ingredients = d.ingredients
    .map((i) => ({ ...i, ingredientId: slug(i.ingredientId) }))
    .filter((i) => (known.has(i.ingredientId) ? true : (dropped.push(i.ingredientId), false)));
  let id = slug(d.nameEn.replace(/\+.*$/, "")) || "dish";
  while (data.dishes[id]) id = `${id}_2`;
  const pb = data.dishes[d.planBId];
  const planBId = pb && isStaplesOnly(pb, data.ingredients) && !pb.prepAhead ? d.planBId : d.slots.includes("breakfast") ? "upma" : "dal_khichdi";
  return {
    dish: {
      id, nameEn: d.nameEn, nameCook: d.nameCook, nameCookHi: d.nameCookHi ?? undefined, slots: d.slots,
      cuisine: d.cuisine, effort: d.effort, kind: d.kind, ingredients,
      prepAhead: d.prepAhead && d.prepAhead.leadHours >= 4 ? d.prepAhead : undefined,
      planBId, recipeCook: d.recipeCook || undefined, active: true, rating: 0, lastCookedAt: null,
    },
    newIngredients,
    dropped,
  };
}
