
export interface D033Eligibility {
  paper: "yes" | "borderline" | "no";
  personal_broker: "yes" | "borderline" | "no";
  challenge_z: "yes" | "borderline" | "no";
  propfirm: "yes" | "borderline" | "no";
}

export interface D033 {
  tier_davey: "STATISTICALLY_ROBUST" | "HIGH" | "MEDIUM" | "LOW" | "Archive";
  deployment_stage: "rd" | "backtest_validated" | "paper" | "broker" | "propfirm" | "challenge_z";
  eligibility: D033Eligibility;
  schema_version: string;
  computed_at: string;
}

export interface KPIs {
  profit_factor: number;
  win_rate: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl: number;
  total_pnl_pct: number;
  final_equity: number;
  initial_capital: number;
  composite_score: number;
  prop_score: number;
  max_consec_wins: number;
  max_consec_losses: number;
  challenge_z_score: number;
  sections: string[];
}

export interface StrategyInfo {
  name: string;
  version: string;
  description?: string;
}

export interface UniverseInfo {
  instrument: string;
  timeframe: string;
  type: string;
}

export interface Run {
  run_id: string;
  created_at: string;
  strategy: StrategyInfo;
  universe: UniverseInfo;
  tags: string[];
  notes?: string;
  kpis: KPIs;
  d033?: D033;
}

export interface Trade {
  trade_id: number;
  direction: string;
  entry_dt: string;
  entry_price: number;
  exit_dt: string;
  exit_price: number;
  pnl_usd: number;
  pnl_pct: number;
  bars_held: number;
  cumulative_pnl: number;
}

export interface RunDetail extends Run {
  trades: Trade[];
}

export type KPIColor = "green" | "orange" | "red" | "neutral";

export interface SSENewRun {
  event: "new_run";
  run: Run;
}
