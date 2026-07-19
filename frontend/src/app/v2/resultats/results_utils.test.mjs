// Tests minimaux (node --test, zéro dépendance) des helpers Résultats / Forward evidence V2.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as U from "./results_utils.mjs";
import {
  countReports, reportSpan, parseObservation, parseInsufficient,
} from "./results_utils.mjs";

const LATEST = `# Sigma — Lecture du marché du matin — 2026-07-17
## Activité d'observation
- 13 actifs suivis sur 13.
- 11 configurations déclenchées, 2 sans déclenchement.
- 1 épisode(s) de faible volatilité sur la période.
- Bilan de la journée : positif, niveau de référence — rien à conclure.
## Lecture du marché
- Une dimension d'analyse (moment de la séance) a été écartée car trop peu fréquente pour être fiable.
## Signaux
- Cohérence de la volatilité confirmée ; le régime de faible volatilité ne s'est pas présenté.`;

test("countReports / reportSpan : séances réellement observées", () => {
  const files = ["2026-07-15.md", "2026-07-17.md", "2026-07-16.md", "README.md"];
  assert.equal(countReports(files), 3);              // README ignoré
  assert.deepEqual(reportSpan(files), { from: "2026-07-15", to: "2026-07-17" });
  assert.equal(countReports([]), 0);
  assert.equal(reportSpan([]), null);
});

test("parseObservation : faits réels ; absent -> null (jamais 0 inventé)", () => {
  const o = parseObservation(LATEST);
  assert.equal(o.assetsTracked, 13); assert.equal(o.assetsTotal, 13);
  assert.equal(o.configsOn, 11); assert.equal(o.configsOff, 2);
  assert.equal(o.lowVolEpisodes, 1);
  assert.equal(o.bilan, "positif, niveau de référence — rien à conclure");
  const empty = parseObservation("aucun fait ici");
  assert.deepEqual(empty, { assetsTracked: null, assetsTotal: null, configsOn: null, configsOff: null, lowVolEpisodes: null, bilan: null });
  assert.equal(parseObservation(null), null);
});

test("parseInsufficient : surface VERBATIM les limites signalées ; sinon vide", () => {
  const lims = parseInsufficient(LATEST);
  assert.equal(lims.length, 2);
  assert.ok(lims.some((s) => /écartée car trop peu fréquente/.test(s)));
  assert.ok(lims.some((s) => /ne s'est pas présenté/.test(s)));
  assert.deepEqual(parseInsufficient("rien à signaler"), []);
  assert.deepEqual(parseInsufficient(null), []);
});

test("gouvernance sources : aucun parseur de handoff / candidats exposé", () => {
  // Le statut des candidats ne doit venir d'AUCUN artefact instable (handoff exclu).
  assert.equal(typeof U.parseCandidateStatus, "undefined");
  assert.equal(typeof U.parseHandoff, "undefined");
  // Sources stables toujours présentes.
  assert.equal(typeof U.parseObservation, "function");
  assert.equal(typeof U.parseInsufficient, "function");
  assert.equal(typeof U.countReports, "function");
  assert.equal(typeof U.reportSpan, "function");
});
