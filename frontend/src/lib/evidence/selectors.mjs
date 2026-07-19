// Sélecteurs PURS pour l'explorateur de preuves. Zéro donnée fictive, zéro interprétation, testables via node --test.
export const CATEGORY_KEYS = ["robuste", "progression", "exploratoire"];

/** Regroupe par catégorie PUBLIÉE (jamais recalculée). Renvoie TOUJOURS les 3 clés. */
export function groupByCategory(items) {
  const out = { robuste: [], progression: [], exploratoire: [] };
  for (const it of Array.isArray(items) ? items : []) {
    if (it && Object.prototype.hasOwnProperty.call(out, it.category)) out[it.category].push(it);
  }
  return out;
}
/** Fenêtre d'affichage : 3 lignes repliées, tout si déplié. */
export function visibleRows(rows, expanded) {
  const a = Array.isArray(rows) ? rows : [];
  return expanded ? a : a.slice(0, 3);
}
/** Voir tout / Réduire seulement si > 3 lignes. */
export function hasMore(rows) {
  return (Array.isArray(rows) ? rows.length : 0) > 3;
}
/** Recherche par id stable ; introuvable => null (jamais d'invention). */
export function findById(items, id) {
  if (!Array.isArray(items) || typeof id !== "string") return null;
  return items.find((x) => x && x.id === id) || null;
}
