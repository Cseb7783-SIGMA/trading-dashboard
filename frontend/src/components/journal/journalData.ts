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

// JOURNAL_ENTRIES : contient TOUS les checks quotidiens (SKIPs + trades)
// Utilisé pour calculer les stats globales et le résumé par stratégie.
// Pour la table détaillée trade-centric, on filtre sur statut ≠ SKIP.
export const JOURNAL_ENTRIES: JournalEntry[] = [
  {
    date: "2026-05-19", strategie: "V10 IWM", defi: "Paper", asset: "IWM",
    timeframe: "D", direction: "—", capital: 10000, riskPct: 0.5, riskDollar: 50,
    entry: null, stop: null, exit: null, statut: "SKIP",
    pnl: 0, rMultiple: null, balance: 10000,
    notes: "VIX OK (18.06), BB pas touché — RSI 46.67 hors zone",
  },
  {
    date: "2026-05-20", strategie: "V10 IWM", defi: "Paper", asset: "IWM",
    timeframe: "D", direction: "—", capital: 10000, riskPct: 0.5, riskDollar: 50,
    entry: null, stop: null, exit: null, statut: "SKIP",
    pnl: 0, rMultiple: null, balance: 10000,
    notes: "VIX 17.44, RSI 55.38 hors zone",
  },
  {
    date: "2026-05-21", strategie: "V10 IWM", defi: "Paper", asset: "IWM",
    timeframe: "D", direction: "—", capital: 10000, riskPct: 0.5, riskDollar: 50,
    entry: null, stop: null, exit: null, statut: "SKIP",
    pnl: 0, rMultiple: null, balance: 10000,
    notes: "IWM monte (283.05), RSI 58.75 hors zone",
  },
  {
    date: "2026-05-22", strategie: "V10 IWM", defi: "Paper", asset: "IWM",
    timeframe: "D", direction: "—", capital: 10000, riskPct: 0.5, riskDollar: 50,
    entry: null, stop: null, exit: null, statut: "SKIP",
    pnl: 0, rMultiple: null, balance: 10000,
    notes: "IWM continue montée (283.96), RSI 59.72",
  },
  // Quand un trade s'enclenchera, on aura une entrée comme celle-ci :
  // {
  //   date: "2026-06-15",      ← date d'entrée
  //   exitDate: "2026-06-22",  ← rempli à la sortie
  //   strategie: "V10 IWM", defi: "Paper", asset: "IWM",
  //   timeframe: "D", direction: "LONG", capital: 10000, riskPct: 0.5, riskDollar: 50,
  //   entry: 271.50, stop: 259.25, exit: 279.80,
  //   statut: "W", pnl: 34.00, rMultiple: 0.68, balance: 10034,
  //   notes: "TP atteint J+5 (close > BB_mid 280.10)",
  // },
];

export type StrategyRow = {
  strategie: string;
  asset: string;
  timeframe: string;
  defi: "Paper" | "PropFirm" | "Challenge Z";
  joursActifs: number;
  signaux: number;
  trades: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number | null;
  pnlNet: number;
  balance: number;
};

export const STRATEGY_SUMMARY: StrategyRow[] = [
  {
    strategie: "V10 IWM", asset: "IWM", timeframe: "D", defi: "Paper",
    joursActifs: 4, signaux: 4, trades: 0,
    wins: 0, losses: 0, be: 0,
    winRate: null, pnlNet: 0, balance: 10000,
  },
];

export const DEFI_SUMMARY = {
  paper: {
    label: "Paper V10 IWM",
    balance: 10000,
    pnl: 0,
    trades: 0,
    wins: 0, losses: 0, be: 0,
    skips: 4,
    signaux: 4,
    winRate: null as number | null,
    streak: "—",
    maxDD: 0,
    active: true,
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
