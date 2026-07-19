import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByCategory, visibleRows, hasMore, findById, CATEGORY_KEYS } from "./selectors.mjs";

const mk = (id, category) => ({ id, category, asset: id, timeframe: "1D", configuration: "c" });

test("groupByCategory : toujours 3 catégories, réparties selon la preuve publiée", () => {
  const g = groupByCategory([mk("a", "robuste"), mk("b", "exploratoire"), mk("c", "robuste")]);
  assert.deepEqual(Object.keys(g), CATEGORY_KEYS);
  assert.equal(g.robuste.length, 2);
  assert.equal(g.progression.length, 0);
  assert.equal(g.exploratoire.length, 1);
  const empty = groupByCategory([]);
  assert.deepEqual(Object.keys(empty), CATEGORY_KEYS);
  assert.deepEqual(groupByCategory(null).robuste, []);
});

test("visibleRows : 3 repliées, tout déplié", () => {
  const rows = [1, 2, 3, 4, 5].map((n) => mk("x" + n, "robuste"));
  assert.equal(visibleRows(rows, false).length, 3);
  assert.equal(visibleRows(rows, true).length, 5);
  assert.equal(visibleRows(null, false).length, 0);
});

test("hasMore : bouton seulement si > 3 lignes", () => {
  assert.equal(hasMore([1, 2, 3]), false);
  assert.equal(hasMore([1, 2, 3, 4]), true);
  assert.equal(hasMore([]), false);
});

test("findById : id stable ; introuvable => null", () => {
  const rows = [mk("qqq-1d-x", "robuste"), mk("spy-1d-y", "robuste")];
  assert.equal(findById(rows, "spy-1d-y").id, "spy-1d-y");
  assert.equal(findById(rows, "absent"), null);
  assert.equal(findById(null, "x"), null);
});
