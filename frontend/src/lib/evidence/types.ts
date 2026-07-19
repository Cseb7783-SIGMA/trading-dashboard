// V2 Résultats détaillés — contrats de données (types partagés). Aucun couplage au format futur des fichiers.
export type EvidenceCategory = "robuste" | "progression" | "exploratoire";

export interface EvidenceSummary {
  id: string;                 // strategyKey stable : Actif × Timeframe × Configuration
  category: EvidenceCategory; // vient de la preuve PUBLIÉE, jamais calculée par l'UI
  asset: string;
  timeframe: string;
  configuration: string;
  episodeCount?: number;      // absent => non publié ; 0 seulement si vrai zéro publié
  tradeCount?: number;
  updatedAt?: string;
}
export interface EpisodeSummary {
  id: string;
  evidenceId: string;
  label?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  context?: string;      // contexte public neutre (ex. « Volatilité normale ») ; absent => Non publié
  tradeCount?: number;   // trades réels publiés pour l'épisode ; absent => Non publié, jamais 0 inventé
}
export interface TradeSummary {
  id: string;
  episodeId: string;
  asset?: string;
  timeframe?: string;
  openedAt?: string;
  closedAt?: string;
  resultStatus?: string;
}
export interface ScientificTradeRecord {
  context?: string;
  observations?: string;
  agentDecision?: string;   // décision structurée + observations publiables ; jamais raisonnement/instructions internes
  entry?: string;
  stop?: string;
  target?: string;
  management?: string;
  exit?: string;
  result?: string;
  postMortem?: string;
  learning?: string;
}
export const CATEGORIES: { key: EvidenceCategory; slug: string; title: string }[] = [
  { key: "robuste", slug: "robustes", title: "Stratégies robustes" },
  { key: "progression", slug: "progression", title: "Stratégies en progression" },
  { key: "exploratoire", slug: "exploratoires", title: "Stratégies exploratoires" },
];
export const CATEGORY_BY_SLUG: Record<string, EvidenceCategory> = {
  robustes: "robuste",
  progression: "progression",
  exploratoires: "exploratoire",
};
