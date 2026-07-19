// Tests minimaux (node --test, zéro dépendance) des helpers Lecture détaillée V2.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRegimeDistribution, parseVolatility, parseTrackedAssets, regimeConsensus, parsePerAsset,
} from "./lecture_detail_utils.mjs";

const ASSET_BLOCK = `## Lecture par actif (timeframe calculé : 1D — quotidien)

| actif | timeframe | direction | régime | volatilité |
|---|---|---|---|---|
| QQQ | 1D | neutre | transition | élevée |
| SPY | 1D | haussier | tendance | normale |
| XLV | 1D | neutre | range | n/d |`;

test("parsePerAsset : lit la table par actif ; en-tête/séparateur ignorés ; n/d -> null", () => {
  const rows = parsePerAsset(ASSET_BLOCK);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { actif: "QQQ", timeframe: "1D", direction: "neutre", regime: "transition", volatility: "élevée" });
  assert.deepEqual(rows[1], { actif: "SPY", timeframe: "1D", direction: "haussier", regime: "tendance", volatility: "normale" });
  assert.equal(rows[2].volatility, null); // « n/d » -> null, jamais « normale »
  assert.deepEqual(parsePerAsset("aucun bloc"), []);
  assert.deepEqual(parsePerAsset(null), []);
});

// Fragment RÉEL de latest.md (2026-07-17).
const LATEST = `## Activité d'observation
- 13 actifs suivis sur 13.
## Lecture du marché
- Tendance de fond : consolidation 8 sur 13, transition 3 sur 13, hausse 2 sur 13. Marché globalement sans direction franche.
- Volatilité : élevée sur 7 des 13 actifs à la dernière séance.`;

test("parseRegimeDistribution : lit la distribution réelle ; absent -> null", () => {
  const d = parseRegimeDistribution(LATEST);
  assert.deepEqual(d, { buckets: [
    { label: "consolidation", count: 8 },
    { label: "transition", count: 3 },
    { label: "hausse", count: 2 },
  ], total: 13 });
  assert.equal(parseRegimeDistribution("pas de ligne tendance"), null);
  assert.equal(parseRegimeDistribution(null), null);
});

test("parseVolatility : niveau + compte réels ; absent -> null", () => {
  assert.deepEqual(parseVolatility(LATEST), { level: "élevée", count: 7, total: 13 });
  assert.equal(parseVolatility("rien"), null);
  assert.equal(parseVolatility(null), null);
});

test("parseTrackedAssets : N/M réels ; absent -> null", () => {
  assert.deepEqual(parseTrackedAssets(LATEST), { tracked: 13, total: 13 });
  assert.equal(parseTrackedAssets("rien"), null);
});

test("regimeConsensus : régime dominant + règle >=50% explicite et testable", () => {
  // consolidation 8/13 = 61,5% >= 50% => consensus
  const c = regimeConsensus(parseRegimeDistribution(LATEST));
  assert.equal(c.dominant, "consolidation");
  assert.equal(c.count, 8);
  assert.equal(c.total, 13);
  assert.ok(Math.abs(c.share - 8 / 13) < 1e-9);
  assert.equal(c.aligned, true);
});

test("regimeConsensus : dispersion si dominant < 50%", () => {
  const disp = { buckets: [{ label: "range", count: 5 }, { label: "hausse", count: 4 }, { label: "baisse", count: 4 }], total: 13 };
  const c = regimeConsensus(disp);
  assert.equal(c.dominant, "range");
  assert.equal(c.aligned, false); // 5/13 = 38% < 50%
});

test("regimeConsensus : égalité stricte du max => pas d'alignement (aucun départage arbitraire)", () => {
  const tie = { buckets: [{ label: "hausse", count: 6 }, { label: "range", count: 6 }, { label: "baisse", count: 0 }], total: 12 };
  const c = regimeConsensus(tie);
  assert.equal(c.aligned, false); // 6/12 = 50% MAIS égalité => non aligné
  assert.equal(regimeConsensus(null), null);
  assert.equal(regimeConsensus({ buckets: [], total: 0 }), null);
});
