// T3B — SMOKE externe de la V2 publique (INDEPENDANT du VPS). LECTURE SEULE.
// Cible = SMOKE_BASE (defaut https://lab-trading.labuena.ca). Franchit Cloudflare Access via
// jeton de service : en-tetes CF-Access-Client-Id / CF-Access-Client-Secret lus dans l'env.
// AUCUN secret imprime/écrit. Ne corrige/republie/relance rien. Sortie machine PASS/ANOMALY + exit code.
const { chromium } = require("@playwright/test");
const fs = require("fs");

const BASE = (process.env.SMOKE_BASE || "https://lab-trading.labuena.ca").replace(/\/$/, "");
const RAW = process.env.SMOKE_RAW || "https://raw.githubusercontent.com/Cseb7783-SIGMA/sigma-reports/main";
const CID = process.env.CF_ACCESS_CLIENT_ID || "";
const CSECRET = process.env.CF_ACCESS_CLIENT_SECRET || "";
const STATUS = process.env.SMOKE_STATUS || "./smoke_status.json";
const HISTORY = process.env.SMOKE_HISTORY || "./smoke_history.jsonl";
const LEAK = /net_R|entry_price|exit_price|base_sha|PR-2026|\b\d+[.,]\d{3,}\b/;
const STATUS_LABELS = ["Résultat observé", "Vrai zéro", "Données manquantes", "Séance périmée", "Erreur de traitement"];
const CODE_LABEL = { result: "Résultat observé", zero: "Vrai zéro", data_gap: "Données manquantes", stale: "Séance périmée", error: "Erreur de traitement" };
const ALLOWED_CF_HOST = "lab-trading.labuena.ca";

const results = [];
const add = (id, name, status, detail) => results.push({ id, name, status, detail });
const isTunnel = /127\.0\.0\.1|localhost/.test(BASE);

(async () => {
  let baseHost = ""; try { baseHost = new URL(BASE).host; } catch (e) {}
  const headers = {};
  if (CID && CSECRET && baseHost === ALLOWED_CF_HOST) {
    headers["CF-Access-Client-Id"] = CID;
    headers["CF-Access-Client-Secret"] = CSECRET;
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ extraHTTPHeaders: headers });
  const page = await ctx.newPage();
  let leaked = false;

  async function visit(path) {
    const resp = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 25000 });
    const body = await page.locator("body").innerText().catch(() => "");
    if (LEAK.test(body)) leaked = true;
    return { status: resp ? resp.status() : 0, url: page.url() };
  }

  try {
    const r0 = await visit("/v2/resultats");
    const onAccess = /cloudflareaccess\.com/.test(r0.url) ||
      (await page.getByText(/Sign in|Cloudflare Access|Authenticating/i).count()) > 0;
    if (isTunnel) add(1, "Cloudflare Access franchi", "WARN", "tunnel local : SSO non applicable (validation logique)");
    else if (onAccess || r0.status === 403) add(1, "Cloudflare Access franchi", "ANOMALY", `bloqué par Access (status ${r0.status}, url ${r0.url})`);
    else add(1, "Cloudflare Access franchi", "PASS", `accès applicatif (status ${r0.status})`);

    const routes = ["/v2/resultats", "/v2/resultats-detailles", "/v2/resultats-detailles/progression", "/v2/lecture-marche", "/v2/tendances-marche"];
    const bad = [];
    for (const rt of routes) {
      const r = await visit(rt);
      if (r.status !== 200) bad.push(`${rt}=${r.status}`);
    }
    add(2, "routes critiques 200", bad.length ? "ANOMALY" : "PASS", bad.length ? bad.join(", ") : `${routes.length} routes OK`);

    let raw = null;
    try { raw = await (await fetch(`${RAW}/result/latest.json?t=${Date.now()}`, { cache: "no-store" })).json(); } catch (e) {}
    const expSession = raw && raw.expected_session;

    await visit("/v2/resultats");
    let shown = null;
    try { shown = (await page.locator("text=/Séance 2026-\\d{2}-\\d{2}/").first().innerText()).match(/2026-\d{2}-\d{2}/)[0]; } catch (e) {}
    if (!expSession) add(3, "séance == RESULT", "ANOMALY", "raw result indisponible");
    else if (shown !== expSession) add(3, "séance == RESULT", "ANOMALY", `affichée=${shown} != RESULT=${expSession}`);
    else add(3, "séance == RESULT", "PASS", `séance ${shown}`);

    const rawByAsset = {};
    ((raw && raw.statuses) || []).forEach((s) => { rawByAsset[s.asset] = s.status; });
    const rowStatuses = {};
    const mism4 = [];
    for (const a of ["SPY", "IWM", "QQQ"]) {
      const row = page.locator("tr", { hasText: a }).first();
      const txt = (await row.count()) ? await row.innerText() : "";
      const shownLabel = STATUS_LABELS.find((l) => txt.includes(l)) || null;
      rowStatuses[a] = shownLabel;
      const code = rawByAsset[a];
      const expectedLabel = CODE_LABEL[code];
      if (!raw) mism4.push(`${a}: RESULT raw indisponible`);
      else if (!expectedLabel) mism4.push(`${a}: absent du RESULT`);
      else if (shownLabel !== expectedLabel) mism4.push(`${a}: affiché='${shownLabel}' != RESULT='${expectedLabel}' (${code})`);
    }
    add(4, "statuts affichés == RESULT réel", mism4.length ? "ANOMALY" : "PASS", mism4.length ? mism4.join("; ") : JSON.stringify(rowStatuses));

    try {
      await visit("/v2/resultats-detailles/progression");
      await page.getByRole("link", { name: /Ouvrir QQQ/ }).click();
      await page.waitForURL(/\/resultats-detailles\/p[0-9a-f]{8}$/, { timeout: 15000 });
      await page.getByRole("heading", { name: /Épisodes/ }).waitFor({ timeout: 15000 });
      await page.getByRole("link", { name: /Ouvrir le dossier du trade/ }).first().click();
      await page.waitForURL(/\/trades\/t[0-9a-f]{8}$/, { timeout: 15000 });
      await page.getByRole("heading", { name: /Dossier scientifique/ }).waitFor({ timeout: 10000 });
      add(5, "nav config→épisode→trade→dossier", "PASS", "parcours complet atteint");
    } catch (e) {
      add(5, "nav config→épisode→trade→dossier", "ANOMALY", `parcours interrompu: ${e.message.split("\n")[0]}`);
    }

    await visit("/v2/resultats-detailles/progression");
    await page.getByRole("link", { name: /Ouvrir QQQ/ }).click().catch(() => {});
    await page.getByRole("heading", { name: /Épisodes/ }).waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const ncol = await page.getByRole("columnheader", { name: "Trade", exact: true }).count();
    add(6, "tableau des trades présent", ncol > 0 ? "PASS" : "ANOMALY", `columnheader 'Trade' x${ncol}`);

    const staleServed = expSession && shown && shown !== expSession;
    const summStale = raw && raw.summary && (raw.summary.stale || raw.summary.error);
    add(7, "fraîcheur (rien de périmé)", (staleServed || summStale) ? "ANOMALY" : "PASS", `séance rendue=${shown} raw=${expSession} summary=${JSON.stringify(raw && raw.summary)}`);

    add(8, "aucune fuite publique", leaked ? "ANOMALY" : "PASS", leaked ? "motif sensible détecté" : "aucun motif (net_R/prix/base_sha/PR/décimales brutes)");
  } catch (e) {
    add(99, "exécution smoke", "ANOMALY", `erreur globale: ${e.message.split("\n")[0]}`);
  } finally {
    await browser.close();
  }

  const overall = results.some((r) => r.status === "ANOMALY") ? "ANOMALY" : "PASS";
  const cause = results.filter((r) => r.status === "ANOMALY").map((r) => `[${r.id}] ${r.name}: ${r.detail}`).join("; ") || null;
  const payload = { schema: "1.0", checked_at: new Date().toISOString(), base: BASE, cf_token_present: Boolean(CID && CSECRET), overall, checks: results, cause };
  fs.writeFileSync(STATUS, JSON.stringify(payload, null, 2));
  fs.appendFileSync(HISTORY, JSON.stringify({ checked_at: payload.checked_at, base: BASE, overall, cause }) + "\n");
  console.log(`SMOKE ${overall} · base ${BASE} · token=${payload.cf_token_present}`);
  for (const r of results) console.log(`  [${r.id}] ${r.status.padEnd(7)} ${r.name} — ${r.detail}`);
  if (cause) console.log("CAUSE:", cause);
  process.exit(overall === "ANOMALY" ? 1 : 0);
})().catch((e) => { console.error("ERR", e.message); process.exit(2); });
