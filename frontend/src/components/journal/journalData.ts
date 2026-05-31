// Données du journal — hardcodées pour le moment (S46).
// Plus tard : remplacer par fetch vers /api/journal qui parse le markdown
// docs/paper_trading/2026-S46_v10_iwm_journal.md

export type JournalEntry = {
  // Métadonnées trade
  date: string;          // date d'entrée du trade (ou date de check si SKIP)
  exitDate?: string;     // date de sortie (rempli à la clôture du trade)
  strategie: string;
  defi: "Paper" | "PropFirm" | "Challenge Z";
  asset: string;
  timeframe: string;
  direction: "LONG" | "SHORT" | "—";

  // Sizing
  capital: number;
  riskPct: number;
  riskDollar: number;

  // Prix
  entry: number | null;
  stop: number | null;
  exit: number | null;

  // Résultat
  statut: "W" | "L" | "BE" | "SKIP" | "OPEN";
  pnl: number;
  rMultiple: number | null;
  balance: number;
  notes: string;
};

// JOURNAL_ENTRIES : entries quotidiennes (SKIPs + trades)
// Clean state S59 — V10 IWM mock retiré. Sera repopulé Phase 3 (D-001 v2 paper natif).
export const JOURNAL_ENTRIES: JournalEntry[] = [];

export const DEFI_SUMMARY = {
  paper: {
    label: "Personal Broker",
    active: false,
  },
  propfirm: {
    label: "PropFirm",
    active: false,
  },
  challengeZ: {
    label: "Challenge Z",
    active: false,
  },
};

// STRATEGY_SUMMARY : résumé par stratégie active
// Clean state S59 — vide jusqu'à Phase 3 (paper natif active)
export const STRATEGY_SUMMARY: Array<{
  strategie: string;
  asset: string;
  timeframe: string;
  defi: "Personal Broker" | "PropFirm" | "Challenge Z";
  jours: number;
  signaux: number;
  trades: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number | null;
  pnl: number;
  balance: number;
}> = [];
