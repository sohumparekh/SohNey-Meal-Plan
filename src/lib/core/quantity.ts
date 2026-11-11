import type { Ingredient } from "./types";

/** Number of purchasable packs needed for `qty` recipe units (always at least 1). */
export function packsFor(ing: Ingredient, qty: number) {
  if (qty <= 0) return 0;
  return Math.max(1, Math.ceil(qty / ing.pack - 1e-9));
}

function fmtNum(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

/** Human label for buying `packs` packs, e.g. "500 g", "2 bunches", "1 packet (6 pav)". */
export function packLabel(ing: Ingredient, packs: number) {
  if (ing.unit === "bunch") return `${packs} ${packs === 1 ? "bunch" : "bunches"}`;
  if (ing.unit === "g" && /^\d+ g$/.test(ing.packLabel)) {
    const g = packs * ing.pack;
    return g >= 1000 ? `${fmtNum(g / 1000)} kg` : `${g} g`;
  }
  if (ing.unit === "ml" && /^\d+ ml$/.test(ing.packLabel)) {
    const ml = packs * ing.pack;
    return ml >= 1000 ? `${fmtNum(ml / 1000)} L` : `${ml} ml`;
  }
  if (ing.unit === "pc" && ing.pack === 1) return `${packs} pc`;
  return packs === 1 ? ing.packLabel : `${packs} × ${ing.packLabel}`;
}
