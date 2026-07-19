import { test, expect } from "@playwright/test";

// Le parcours utilisateur RÉEL de l'explorateur V2 (gate obligatoire avant « livré »).
// La navigation dépend d'un identifiant public OPAQUE (p + 8 hex), jamais du libellé.
const OPAQUE = /\/v2\/resultats-detailles\/p[0-9a-f]{8}$/;

test("hub : 3 pages de catégorie distinctes", async ({ page }) => {
  await page.goto("/v2/resultats-detailles");
  await expect(page.getByRole("link", { name: /Stratégies robustes/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Stratégies en progression/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Stratégies exploratoires/ })).toBeVisible();
});

test("progression : lignes interactives + clic QQQ -> config -> épisodes vides", async ({ page }) => {
  await page.goto("/v2/resultats-detailles");
  await page.getByRole("link", { name: /Stratégies en progression/ }).click();
  await expect(page).toHaveURL(/\/v2\/resultats-detailles\/progression$/);

  // IWM, META, QQQ présents ET interactifs (role=link avec libellé « Ouvrir … »)
  for (const a of ["IWM", "META", "QQQ"]) {
    await expect(page.getByRole("link", { name: new RegExp(`Ouvrir ${a}`) })).toBeVisible();
  }

  // clic réel sur la ligne QQQ
  await page.getByRole("link", { name: /Ouvrir QQQ/ }).click();
  await expect(page).toHaveURL(OPAQUE);                       // l'URL change vers l'id opaque
  await expect(page.getByRole("navigation", { name: /Fil d'Ariane/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Épisodes/ })).toBeVisible();
  // QQQ : épisodes en blocs + trades imbriqués cliquables directement
  await expect(page.getByText(/Épisode 2026/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Ouvrir le dossier du trade/ }).first()).toBeVisible();
});

test("clavier : Entrée sur la ligne IWM ouvre la configuration", async ({ page }) => {
  await page.goto("/v2/resultats-detailles/progression");
  const row = page.getByRole("link", { name: /Ouvrir IWM/ });
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(OPAQUE);
  await expect(page.getByRole("heading", { name: /Épisodes/ })).toBeVisible();
});

test("clavier : Espace ouvre aussi la ligne", async ({ page }) => {
  await page.goto("/v2/resultats-detailles/progression");
  await page.getByRole("link", { name: /Ouvrir META/ }).focus();
  await page.keyboard.press(" ");
  await expect(page).toHaveURL(OPAQUE);
});

test("Voir tout / Réduire : 3 lignes repliées, 4 dépliées", async ({ page }) => {
  await page.goto("/v2/resultats-detailles/progression");
  // TSLA (4e) masqué au départ
  await expect(page.getByRole("link", { name: /Ouvrir TSLA/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Voir tout/ }).click();
  await expect(page.getByRole("link", { name: /Ouvrir TSLA/ })).toBeVisible();
  await page.getByRole("button", { name: /Réduire/ }).click();
  await expect(page.getByRole("link", { name: /Ouvrir TSLA/ })).toHaveCount(0);
});

test("exploratoires : clic SPY -> config -> épisodes réels", async ({ page }) => {
  await page.goto("/v2/resultats-detailles/exploratoires");
  await expect(page.getByRole("link", { name: /Ouvrir SPY/ })).toBeVisible();
  await page.getByRole("link", { name: /Ouvrir SPY/ }).click();
  await expect(page).toHaveURL(OPAQUE);
  await expect(page.getByRole("heading", { name: /Épisodes/ })).toBeVisible();
  await expect(page.getByText(/Épisode 2026/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Ouvrir le dossier du trade/ }).first()).toBeVisible();
});

test("robustes : honnêtement vide", async ({ page }) => {
  await page.goto("/v2/resultats-detailles/robustes");
  await expect(page.getByText("Aucune preuve publiée")).toBeVisible();
});
