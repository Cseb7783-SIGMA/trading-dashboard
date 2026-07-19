// V2 Résultats / Forward evidence — helpers PURS (aucun React, aucun réseau, aucune performance inventée).
// Sources produit STABLES uniquement : latest.md + history/*.md.
// handoff/latest.md est EXCLU : filtré et publié seulement lors d'une décision attendue -> pas un contrat de données stable.
// Règle d'or : une donnée absente => null / liste vide. JAMAIS convertie en 0 ni extrapolée. Un vrai 0 reste 0.
// Testable via `node --test results_utils.test.mjs`.

function isReportFile(name) {
  return typeof name === "string" && /^\d{4}-\d{2}-\d{2}\.md$/.test(name);
}
function dateLabel(name) {
  return typeof name === "string" ? name.replace(/\.md$/, "") : "";
}
function sortDesc(names) {
  return (Array.isArray(names) ? names : []).filter(isReportFile).sort().reverse();
}

/** Nombre de séances réellement observées (fichiers historiques valides). */
export function countReports(names) {
  return sortDesc(names).length;
}

/** Étendue temporelle observée { from, to } (dates AAAA-MM-JJ) ou null si vide. */
export function reportSpan(names) {
  const s = sortDesc(names);
  if (!s.length) return null;
  return { from: dateLabel(s[s.length - 1]), to: dateLabel(s[0]) };
}

/** Extrait les faits d'observation de la lecture du jour. Champ absent => null (jamais 0 inventé). */
export function parseObservation(md) {
  if (typeof md !== "string") return null;
  const assets = md.match(/(\d+)\s+actifs?\s+suivis?\s+sur\s+(\d+)/i);
  const cfg = md.match(/(\d+)\s+configurations?\s+déclenchées,\s*(\d+)\s+sans/i);
  const lowvol = md.match(/(\d+)\s+épisode\(s\)\s+de\s+faible\s+volatilité/i);
  const bilan = md.match(/Bilan de la journée\s*:\s*([^\n]+)/i);
  return {
    assetsTracked: assets ? Number(assets[1]) : null,
    assetsTotal: assets ? Number(assets[2]) : null,
    configsOn: cfg ? Number(cfg[1]) : null,
    configsOff: cfg ? Number(cfg[2]) : null,
    lowVolEpisodes: lowvol ? Number(lowvol[1]) : null,
    bilan: bilan ? bilan[1].trim().replace(/\.\s*$/, "") : null,
  };
}

/** Remonte, VERBATIM, les limites de données signalées par l'artefact (écartée / trop peu / insuffisant / non présenté).
 *  Ne conclut rien de lui-même : ne fait que surfacer les phrases existantes. Liste vide si rien de signalé. */
export function parseInsufficient(md) {
  if (typeof md !== "string") return [];
  const out = [];
  for (const line of md.split(/\r?\n/)) {
    const t = line.replace(/^[-*]\s*/, "").trim();
    if (!t) continue;
    if (/écartée|trop peu|insuffis|ne s'est pas présenté/i.test(t)) out.push(t.replace(/\.\s*$/, ""));
  }
  return out;
}
// Note : aucun parseur de candidats ici. Le statut des candidats ne provient d'AUCUN artefact produit stable
// (les handoffs sont exclus), donc il n'est pas déduit — la page affiche « non publié ».
