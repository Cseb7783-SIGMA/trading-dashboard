// Tests minimaux (node --test, zéro dépendance) des helpers Historique V2.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isReportFile, dateLabel, sortReportsDesc, mostRecent,
  latestDateFromMarkdown, resolveCurrent,
  parseConfigs, buildConfigSeries, seriesMax,
  reportForDate, pointLabel, isSelectedDate,
} from "./history_utils.mjs";

test("tri du plus récent au plus ancien", () => {
  assert.deepEqual(
    sortReportsDesc(["2026-07-15.md", "2026-07-17.md", "2026-07-16.md"]),
    ["2026-07-17.md", "2026-07-16.md", "2026-07-15.md"]
  );
});

test("dossier vide / entrée absente géré proprement", () => {
  assert.deepEqual(sortReportsDesc([]), []);
  assert.equal(mostRecent([]), null);
  assert.deepEqual(sortReportsDesc(null), []);
});

test("entrées invalides ignorées (jamais d'invention)", () => {
  assert.equal(isReportFile("2026-07-17.md"), true);
  assert.equal(isReportFile("README.md"), false);
  assert.equal(isReportFile(null), false);
  assert.deepEqual(sortReportsDesc(["2026-07-16.md", "x", "2026-07-17.md"]), ["2026-07-17.md", "2026-07-16.md"]);
});

test("libellé date", () => {
  assert.equal(dateLabel("2026-07-17.md"), "2026-07-17");
  assert.equal(dateLabel(null), "");
});

test("resolveCurrent : actuelle seulement si lien fiable latest.md", () => {
  const files = ["2026-07-15.md", "2026-07-16.md", "2026-07-17.md"];
  assert.equal(resolveCurrent(files, "# … du matin — 2026-07-17"), "2026-07-17.md");
  assert.equal(resolveCurrent(files, "# … du matin — 2026-07-20"), null);
  assert.equal(resolveCurrent(files, null), null);
});

test("parseConfigs : lit N déclenchées / M sans ; absent -> null ; vrai 0 conservé", () => {
  assert.deepEqual(parseConfigs("- 8 configurations déclenchées, 5 sans déclenchement."), { on: 8, off: 5 });
  assert.deepEqual(parseConfigs("- 13 configurations déclenchées, 0 sans déclenchement."), { on: 13, off: 0 }); // vrai 0
  assert.equal(parseConfigs("aucune ligne configurations ici"), null); // absent -> null (pas 0)
  assert.equal(parseConfigs(null), null);
});

test("buildConfigSeries : md absent -> available:false, jamais zéro", () => {
  const s = buildConfigSeries([
    { date: "2026-07-15", md: "- 8 configurations déclenchées, 5 sans déclenchement." },
    { date: "2026-07-16", md: null },                       // indisponible
    { date: "2026-07-17", md: "- 11 configurations déclenchées, 2 sans déclenchement." },
  ]);
  assert.deepEqual(s[0], { date: "2026-07-15", on: 8, off: 5, available: true });
  assert.deepEqual(s[1], { date: "2026-07-16", on: null, off: null, available: false });
  assert.deepEqual(s[2], { date: "2026-07-17", on: 11, off: 2, available: true });
});

test("seriesMax ignore les null, minimum 1", () => {
  assert.equal(seriesMax([{ on: 8, off: 5 }, { on: null, off: null }, { on: 11, off: 2 }]), 11);
  assert.equal(seriesMax([{ on: null, off: null }]), 1);
  assert.equal(seriesMax([]), 1);
});

test("reportForDate : date -> rapport si présent, sinon null", () => {
  const files = ["2026-07-15.md", "2026-07-16.md", "2026-07-17.md"];
  assert.equal(reportForDate("2026-07-16", files), "2026-07-16.md"); // lien clic -> rapport
  assert.equal(reportForDate("2026-07-20", files), null);            // date absente -> pas de lien
  assert.equal(reportForDate(null, files), null);
  assert.equal(reportForDate("2026-07-16", null), null);
});

test("isSelectedDate : synchro inverse rapport -> point actif", () => {
  assert.equal(isSelectedDate("2026-07-16", "2026-07-16.md"), true);  // rapport ouvert => point actif
  assert.equal(isSelectedDate("2026-07-15", "2026-07-16.md"), false); // autre date => inactif
  assert.equal(isSelectedDate("2026-07-16", ""), false);              // aucune sélection
  assert.equal(isSelectedDate(null, "2026-07-16.md"), false);
});

test("pointLabel : valeurs exactes accessibles ; n/d si indisponible", () => {
  assert.equal(pointLabel({ date: "2026-07-15", on: 8, off: 5, available: true }), "2026-07-15 : 8 déclenchée(s), 5 sans déclenchement");
  assert.equal(pointLabel({ date: "2026-07-16", on: 13, off: 0, available: true }), "2026-07-16 : 13 déclenchée(s), 0 sans déclenchement"); // vrai 0 exposé
  assert.equal(pointLabel({ date: "2026-07-16", on: null, off: null, available: false }), "2026-07-16 : données indisponibles");
  assert.equal(pointLabel(null), "");
});
