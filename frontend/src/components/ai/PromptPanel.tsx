"use client";
import { useState } from "react";
import type { Run } from "@/lib/types";

const TEMPLATES = [
  {
    label: "Verdict complet",
    prompt: "Analyse ce backtest selon le framework Trading-Lab S46+ et donne-moi ton verdict complet : AVANCER / OPTIMISER / REJETER. Format 6 sections : Verdict, Métriques décisives, Analyse rapide, Prop Score, Risques principaux, Action concrète. Vérifie OBLIGATOIREMENT : (1) catégorie A all-régime ou B régime-aware, filtre déclaré ex-ante ? (2) sample multiplier Phase 1 appliqué ? (3) pipeline D-025 quel étage atteint ? (4) bear sample test PF_2022 ? (5) cross-instrument cohérent ? (6) origine campaign agent = risque overfit in-sample ? (7) compatibilité Challenge Z TMAFX (WR≥60% / RR 1:2 / consec≤3) ?",
  },
  {
    label: "Détecter overfit",
    prompt: `Analyse cette stratégie pour DÉTECTER les signes d'overfit selon framework Trading-Lab. Vérifie OBLIGATOIREMENT 8 dimensions :

1. SAMPLE SIZE & multiplier Phase 1 (< 20 anecdotique, < 50 insuffisant, < 100 marginal, 100+ robuste)
2. ORIGINE AGENT CAMPAIGN (tags discovered-by-agent, iter_X, campaign_X) → méta-règle D-029 risque selection in-sample multiplié par N itérations
3. BEAR SAMPLE PF_2022 (garde-fou D-027 #5) — si manquant ou < 1.0, signal d'overfit régime bull-only
4. CROSS-INSTRUMENT cohérence — si testé sur 1 seul instrument, manque robustesse
5. SUR-AJUSTEMENT paramètres — combien de paramètres free vs trades (rule : ≥ 30 trades par paramètre)
6. WINDOW SHOPPING — performance concentrée sur quelques périodes ?
7. TF STABILITY (D-025 garde-fou #7) — si testé sur 1 TF unique
8. CAMPAIGN ITERATION multiplier — si "best of N iterations", overfit selection ∝ √N

Format de réponse :

## Verdict overfit
[FAIBLE / MOYEN / ÉLEVÉ / CRITIQUE]

## Drapeaux rouges détectés
| Drapeau | Sévérité | Détail observé |
|---------|----------|----------------|
| [dimension] | 🟢/🟠/🔴 | [détail] |

## Sample multiplier appliqué
[Multiplier Phase 1 et impact sur score composite]

## Tests anti-overfit requis avant avancement
[Tests out-of-sample spécifiques — autre instrument, autre période bear/sideways, autre TF]

## Recommandation
[Avancer vers Étage suivant / Tester sur sample indépendant OOS / Rejeter pour overfit méta]`,
  },
  {
    label: "Suggestions orthogonales",
    prompt: `Propose des améliorations STRUCTURELLES (pas de calibration post-hoc) pour cette stratégie selon framework Trading-Lab S46+.

CONTRAINTES OBLIGATOIRES :
1. INTERDIT : tweaker un paramètre existant pour améliorer ce backtest (tripwire T-12 calibration post-hoc)
2. OBLIGATOIRE : changements ORTHOGONAUX — ajouter une dimension nouvelle (autre indicateur orthogonal, filtre régime déclaré ex-ante, TF additionnel), pas modifier les seuils actuels
3. PRÉSERVER la catégorie : si cat. A (all-régime), pas de filtre régime introduit ; si cat. B, filtre régime déjà déclaré et nouveau garde-fou possible
4. CHALLENGE Z : impact estimé sur max_consec_wins (cible ≥ 5) et max_consec_losses (cible ≤ 3)

Format de réponse :

## Améliorations proposées (orthogonales seulement)

| Type | Description | Impact PF/DD estimé | Impact Z (ConsW/L) | Risque overfit |
|------|-------------|---------------------|---------------------|-----------------|
| [Indicateur ajouté / Filtre régime / TF / Garde-fou] | [détail concret] | [+/- X% PF, +/- X% DD] | [+/- X streaks] | [bas/moyen/haut] |

## Justification théorique (basée structure, pas KPIs actuels)
[Pourquoi ces changements selon la STRUCTURE de la stratégie. Aucune référence aux résultats actuels pour éviter anchoring.]

## Test out-of-sample requis
[Sur quel sample indépendant tester pour éviter overfit — Étage 1 daily 22 ans / Étage 2 15-min 5 ans / Étage 3 1-min 1 an]

## Ordre de priorité
1. [Plus impactant] — risque overfit [bas/moyen/haut]
2. [...]
3. [...]

## Critères validation pré-déclarés (D-027 garde-fou #1)
[Quels gates objectifs pour valider AVANT de tester — PF, MaxDD, PF_2022, coverage, sample size, ConsW/L]

## Compatibilité Challenge Z TMAFX
[Si applicable, impact estimé sur WR ≥ 60%, RR ≥ 1.5, ConsL ≤ 3, ConsW ≥ 5]

## Alerte calibration post-hoc
Si une amélioration proposée requiert ajuster un seuil existant à la lumière du backtest actuel, REJETER l'amélioration et indiquer "rejet T-12".`,
  },
  {
    label: "Gap PropFirm",
    prompt: `Analyse cette stratégie selon les critères PropFirm FTMO 100k$ (D-014/D-019) et identifie le GAP exact avant éligibilité.

Critères FTMO 100k$ Standard :
1. Profit cible ≥ 8 % en 30 jours
2. Daily Drawdown max < 5 %
3. Total Drawdown max < 10 %
4. Sample size ≥ 50 trades minimum (D-019), ≥ 100 idéal
5. Profit Factor ≥ 1.5 (gate D-019 robuste)
6. Consistency : pas plus de 50 % du profit sur un seul trade
7. Régularité : performance stable cross-période (pas concentrée bull-only)

Format de réponse :

## Prop Score actuel
[X/5 et calcul détaillé]

## Critères PASS / FAIL FTMO
| Critère | Cible FTMO | Valeur actuelle | Status |
|---------|------------|------------------|--------|
| Profit Factor | ≥ 1.5 | X.XX | ✅/❌ |
| Total Drawdown | < 10 % | -X.X % | ✅/❌ |
| Daily Drawdown estimé | < 5 % | -X.X % | ✅/❌ |
| Sample trades | ≥ 50 | XX | ✅/❌ |
| Profit cible 30j | ≥ 8 % | [extrapolation] | ✅/❌ |
| Consistency single trade | ≤ 50 % | [si dispo] | ✅/❌ |
| Régularité bull/bear | Stable | [PF_2022 vs global] | ✅/❌ |

## Gap analysis détaillée
[Pour chaque critère FAIL, quantifier l'écart et proposer une voie pour le franchir SANS calibration post-hoc — par ex sample plus long, filtre régime, position sizing]

## Risque disqualification estimé
[Probabilité estimée de violer une règle FTMO sur 30 jours simulés]

## Roadmap vers PropFirm Ready
[3-5 étapes concrètes orthogonales pour passer le challenge FTMO — pipeline D-025 Étage 3 IBKR 1-min, paper trading, etc.]

## Verdict final compatibilité PropFirm
[Stratégie viable FTMO après améliorations orthogonales / Non viable structurellement / Pivot vers stratégie différente recommandé]

## Alerte sample size
[Si sample < 50 trades, mention que toute conclusion est anecdotique et nécessite backtest plus long avant validation PropFirm]`,
  },
  {
    label: "Gap Challenge Z",
    prompt: `Analyse cette stratégie selon les critères Challenge Z TMAFX (D-028 S47+) et identifie le GAP exact avant compatibilité 5/5.

Critères Challenge Z (compounding 30 wins) :
1. WR ≥ 60% (sequential wins matter)
2. RR mécanique ≥ 1.5 (idéal 1:2 strict, TP = 2 × SL pip)
3. max_consec_losses ≤ 3
4. max_consec_wins ≥ 5 (autocorrélation positive critique)
5. Trades/an ≥ 100 (atteindre 30 wins en 6-12 mois)
6. Asset class Forex priorité (EUR/USD, GBP/USD, USD/JPY)
7. 100% mécanique (codable, pas de discrétion)

Format de réponse :

## Z Score actuel
[X/5 et calcul détaillé : quels critères PASS, quels FAIL]

## Critères PASS / FAIL
| Critère | Cible Z | Valeur actuelle | Status |
|---------|---------|------------------|--------|
| WR | ≥ 60% | XX.X% | ✅/❌ |
| RR | ≥ 1.5 | X.XX | ✅/❌ |
| max_consec_losses | ≤ 3 | X | ✅/❌ |
| max_consec_wins | ≥ 5 | X | ✅/❌ |
| Trades/an | ≥ 100 | XX | ✅/❌ |
| Asset Forex | Oui | [actuel] | ✅/❌ |
| 100% mécanique | Oui | [actuel] | ✅/❌ |

## Gap analysis détaillée
[Pour chaque critère FAIL, quantifier l'écart et proposer une voie pour le franchir SANS calibration post-hoc]

## Compatibilité Forex (si testée sur autre asset)
[Faisabilité du portage Forex — pip size, sessions intraday, spread, structural différences]

## Roadmap S47+ vers Z 5/5
[3-5 étapes concrètes orthogonales pour passer de Z actuel à Z 5/5]

## Verdict final compatibilité Challenge Z
[Stratégie viable Challenge Z après améliorations orthogonales / Non viable structurellement / Pivot vers stratégie différente recommandé]

## Alerte sample size
[Si sample < 50 trades, mention que toute conclusion est anecdotique et nécessite backtest plus long avant validation Z]`,
  },
];

interface Props {
  run: Run;
  onSubmit: (prompt: string, template: string) => void;
  loading: boolean;
}

export default function PromptPanel({ run, onSubmit, loading }: Props) {
  const [prompt, setPrompt] = useState("");
  const [activeTemplate, setActiveTemplate] = useState("");

  const apply = (t: string, label: string) => {
    setPrompt(t);
    setActiveTemplate(label);
  };

  const handleSubmit = () => {
    onSubmit(prompt, activeTemplate);
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      {/* Contexte actif */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-blue/5 border border-blue/20 rounded text-xs">
        <span className="text-blue font-semibold">Contexte :</span>
        <span className="text-muted">{run.strategy.name} {run.strategy.version} · {run.universe.instrument} · PF {run.kpis.profit_factor.toFixed(2)} · DD {run.kpis.max_drawdown_pct.toFixed(1)}% · {run.kpis.total_trades} trades · Prop {run.kpis.prop_score}/5</span>
      </div>

      {/* Templates */}
      <div className="flex flex-wrap gap-2 mb-3">
        {TEMPLATES.map(({ label, prompt: p }) => (
          <button
            key={label}
            onClick={() => apply(p, label)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              activeTemplate === label
                ? "border-blue text-blue bg-blue/5"
                : "border-border hover:border-blue hover:text-blue text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        value={prompt}
        onChange={(e) => { setPrompt(e.target.value); setActiveTemplate(""); }}
        placeholder="Posez votre question ou décrivez l'amélioration souhaitée…"
        rows={5}
        className="w-full bg-bg border border-border rounded p-3 text-sm text-text placeholder-muted resize-none focus:outline-none focus:border-blue transition-colors font-mono"
      />

      <div className="flex justify-end mt-2">
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || loading}
          className="px-4 py-2 bg-blue text-white text-sm font-semibold rounded hover:bg-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Analyse en cours…" : "Envoyer à Claude"}
        </button>
      </div>
    </div>
  );
}
