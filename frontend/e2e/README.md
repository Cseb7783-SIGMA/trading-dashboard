# Gate QA E2E — Explorateur V2 (Playwright)

Teste le **parcours utilisateur réel** contre le **build déployé**, pas seulement les routes 200.
Raison d'être : une ligne de tableau non cliquable est passée à travers les tests unitaires + routes 200.
Sébastien ne doit plus être le premier testeur fonctionnel.

## Ce qui est couvert (`specs/explorer.spec.ts`)
1. Hub : 3 pages de catégorie distinctes.
2. Progression : lignes réellement interactives ; clic QQQ → URL change vers l'**id opaque** → fil d'Ariane + « Épisodes » + « Aucun épisode publié ».
3. Clavier : **Entrée** ouvre la ligne (IWM).
4. Clavier : **Espace** ouvre la ligne (META).
5. **Voir tout / Réduire** : 3 lignes repliées, 4 dépliées.
6. Exploratoires : clic SPY → config → épisodes vides.
7. Robustes : honnêtement vide (« Aucune preuve publiée »).

Capture + trace **uniquement en cas d'échec** (`test-results/`).

## Cible
Le domaine public est derrière Cloudflare Access (SSO) — non automatisable.
On teste donc le build déployé via **tunnel SSH** vers `127.0.0.1:3100` du VPS (sans SSO).

## Exécuter (depuis un hôte avec navigateur, ex. sandbox Linux)
```bash
npm i -D @playwright/test && npx playwright install chromium
# lib manquante possible sans sudo : apt-get download libxdamage1 ; dpkg -x *.deb /tmp/root
# export LD_LIBRARY_PATH=/tmp/root/usr/lib/<arch>-linux-gnu:$LD_LIBRARY_PATH
ssh -i <clé> -N -L 3100:127.0.0.1:3100 sebastien@<vps> &   # tunnel
npx playwright test                                        # BASE_URL=http://127.0.0.1:3100 par défaut
```

## Gate obligatoire avant « livré »
Une route 200, un build vert et des tests unitaires **ne suffisent pas**. Ce gate E2E (7/7 vert) +
preuve de résultat sont requis avant de déclarer une tranche livrée.
