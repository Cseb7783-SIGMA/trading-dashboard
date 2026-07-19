// V2 Historique — helpers PURS (aucun React, aucun réseau, aucune donnée inventée).
// Testables via `node --test history_utils.test.mjs`. Source unique de la logique de tri/validation/parsing.

/** Un nom de rapport valide = AAAA-MM-JJ.md (rien d'autre n'est accepté). */
export function isReportFile(name) {
  return typeof name === "string" && /^\d{4}-\d{2}-\d{2}\.md$/.test(name);
}

/** Libellé date à partir du nom de fichier (sans extension). */
export function dateLabel(name) {
  return typeof name === "string" ? name.replace(/\.md$/, "") : "";
}

/** Filtre les entrées invalides puis trie du plus récent au plus ancien. Jamais d'invention. */
export function sortReportsDesc(names) {
  return (Array.isArray(names) ? names : []).filter(isReportFile).sort().reverse();
}

/** Le plus récent dans l'historique (ou null). N'implique PAS « lecture courante ». */
export function mostRecent(names) {
  const s = sortReportsDesc(names);
  return s.length ? s[0] : null;
}

/** Date (AAAA-MM-JJ) issue du TITRE de latest.md, ou null si introuvable. Aucune reconstruction. */
export function latestDateFromMarkdown(md) {
  if (typeof md !== "string") return null;
  const title = (md.match(/^#\s+(.+)$/m) || [])[1] || "";
  const m = title.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/** « Lecture courante » = fichier historique lié de façon FIABLE à latest.md (date du titre == <date>.md). Sinon null. */
export function resolveCurrent(names, latestMd) {
  const d = latestDateFromMarkdown(latestMd);
  if (!d) return null;
  const target = d + ".md";
  return sortReportsDesc(names).includes(target) ? target : null;
}

/** Extrait { on, off } de la ligne « N configurations déclenchées, M sans déclenchement ».
 *  Retourne null si la donnée est ABSENTE (jamais convertie en 0). Un vrai 0 reste 0. */
export function parseConfigs(md) {
  if (typeof md !== "string") return null;
  const m = md.match(/(\d+)\s+configurations?\s+déclenchées,\s*(\d+)\s+sans/i);
  if (!m) return null;
  return { on: Number(m[1]), off: Number(m[2]) };
}

/** Construit la série pour le graphique à partir d'entrées {date, md}.
 *  md absent/illisible -> point { available:false, on:null, off:null } (JAMAIS zéro). */
export function buildConfigSeries(entries) {
  return (Array.isArray(entries) ? entries : []).map((e) => {
    const c = e && typeof e.md === "string" ? parseConfigs(e.md) : null;
    return {
      date: e && typeof e.date === "string" ? e.date : "",
      on: c ? c.on : null,
      off: c ? c.off : null,
      available: c !== null,
    };
  });
}

/** Échelle Y = max des valeurs disponibles (ignore null), minimum 1. */
export function seriesMax(series) {
  let m = 0;
  for (const p of Array.isArray(series) ? series : []) {
    if (typeof p.on === "number" && p.on > m) m = p.on;
    if (typeof p.off === "number" && p.off > m) m = p.off;
  }
  return m > 0 ? m : 1;
}

/** Nom de fichier rapport (AAAA-MM-JJ.md) pour une date, seulement s'il existe dans l'historique. Sinon null. */
export function reportForDate(date, names) {
  if (typeof date !== "string") return null;
  const target = date + ".md";
  return sortReportsDesc(names).includes(target) ? target : null;
}

/** Vrai si la date (AAAA-MM-JJ) correspond au rapport sélectionné (nom de fichier). Sert à la synchro inverse rapport -> point actif. */
export function isSelectedDate(date, sel) {
  if (typeof date !== "string" || typeof sel !== "string") return false;
  return date + ".md" === sel;
}

/** Libellé accessible/survol d'un point : valeurs exactes si dispo, sinon « données indisponibles ». */
export function pointLabel(point) {
  if (!point || typeof point !== "object") return "";
  const d = typeof point.date === "string" ? point.date : "";
  if (!point.available || typeof point.on !== "number" || typeof point.off !== "number") {
    return `${d} : données indisponibles`;
  }
  return `${d} : ${point.on} déclenchée(s), ${point.off} sans déclenchement`;
}
