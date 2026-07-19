// V2 Lecture détaillée — helpers PURS (aucun React, aucun réseau, aucune donnée inventée).
// Source produit STABLE unique : latest.md. Ne parse QUE des champs réellement présents.
// Règle d'or : donnée absente => null. Aucun timeframe ni actif nominatif n'est inventé.
// Testable via `node --test lecture_detail_utils.test.mjs`.

/** Distribution des régimes de la ligne « Tendance de fond : X a sur N, Y b sur N, ... ».
 *  Retourne { buckets:[{label,count}], total } ou null si la ligne/format est absent. */
export function parseRegimeDistribution(md) {
  if (typeof md !== "string") return null;
  const line = (md.match(/Tendance de fond\s*:\s*([^\n]+)/i) || [])[1];
  if (!line) return null;
  const buckets = [];
  let total = null;
  const re = /([A-Za-zÀ-ÿ'’-]+)\s+(\d+)\s+sur\s+(\d+)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    buckets.push({ label: m[1].toLowerCase(), count: Number(m[2]) });
    total = Number(m[3]); // « sur N » (identique pour chaque groupe dans l'artefact)
  }
  if (!buckets.length || total == null) return null;
  return { buckets, total };
}

/** Volatilité agrégée de « Volatilité : <niveau> sur K des N actifs ». { level, count, total } ou null. */
export function parseVolatility(md) {
  if (typeof md !== "string") return null;
  const m = md.match(/Volatilité\s*:\s*([A-Za-zÀ-ÿ'’-]+)\s+sur\s+(\d+)\s+des\s+(\d+)/i);
  if (!m) return null;
  return { level: m[1].toLowerCase(), count: Number(m[2]), total: Number(m[3]) };
}

/** Actifs suivis de « N actifs suivis sur M ». { tracked, total } ou null. */
export function parseTrackedAssets(md) {
  if (typeof md !== "string") return null;
  const m = md.match(/(\d+)\s+actifs?\s+suivis?\s+sur\s+(\d+)/i);
  if (!m) return null;
  return { tracked: Number(m[1]), total: Number(m[2]) };
}

/** Lit le bloc « Lecture par actif » (table markdown) publié dans latest.md / history/.
 *  Retourne [{ actif, timeframe, direction, regime, volatility }] ; cellule « n/d » ou vide => null.
 *  Aucune invention : lignes non-ticker (en-tête, séparateur) ignorées ; liste vide si bloc absent. */
export function parsePerAsset(md) {
  if (typeof md !== "string") return [];
  const rows = [];
  for (const line of md.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    if (cells.length < 5) continue;
    const [actif, timeframe, direction, regime, volatility] = cells;
    if (!/^[A-Z]{1,6}$/.test(actif)) continue; // ignore en-tête / séparateur
    const norm = (v) => (!v || v.toLowerCase() === "n/d") ? null : v;
    rows.push({ actif, timeframe: norm(timeframe), direction: norm(direction), regime: norm(regime), volatility: norm(volatility) });
  }
  return rows;
}

/** Consensus de régime — synthèse SIMPLE, EXPLICITE, TESTABLE (aucune interprétation).
 *  RÈGLE : régime le plus fréquent ; s'il représente >= 50% des actifs => consensus, sinon dispersion.
 *  En cas d'égalité stricte du maximum, on retient le premier rencontré et aligned=false (pas de départage arbitraire).
 *  Retourne { dominant, count, total, share, aligned } ou null si distribution absente. */
export function regimeConsensus(distribution) {
  if (!distribution || !Array.isArray(distribution.buckets) || !distribution.buckets.length) return null;
  const total = Number(distribution.total);
  if (!(total > 0)) return null;
  let top = distribution.buckets[0];
  let tie = false;
  for (const b of distribution.buckets.slice(1)) {
    if (b.count > top.count) { top = b; tie = false; }
    else if (b.count === top.count) { tie = true; }
  }
  const share = top.count / total;
  return {
    dominant: top.label,
    count: top.count,
    total,
    share,
    aligned: !tie && share >= 0.5,
  };
}
