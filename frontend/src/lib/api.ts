import type { Run, RunDetail } from "./types";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export async function fetchRuns(): Promise<Run[]> {
  const res = await fetch(`${BASE}/runs`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchRuns: ${res.status}`);
  return res.json();
}

export async function fetchRun(runId: string): Promise<RunDetail> {
  const res = await fetch(`${BASE}/runs/${encodeURIComponent(runId)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchRun: ${res.status}`);
  return res.json();
}

export type TvValidationData = {
  run_id: string;
  engine: { pf?: number | null; net_pct?: number | null; max_dd_pct?: number | null; trades?: number | null };
  tv: { pf?: number; net_pct?: number; max_dd_pct?: number; trades?: number; note?: string; verified_at?: string };
};

export async function fetchTvValidation(runId: string): Promise<TvValidationData> {
  const res = await fetch(`${BASE}/runs/${encodeURIComponent(runId)}/tv-validation`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchTvValidation: ${res.status}`);
  return res.json();
}

export async function parseTvCsv(csvText: string): Promise<{ pf: number | null; net_pct: number | null; max_dd_pct: number | null; trades: number | null; win_rate: number | null; note_auto: string }> {
  const res = await fetch(`${BASE}/tv-validation/parse-csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv_text: csvText }),
  });
  if (!res.ok) throw new Error(`parseTvCsv: ${res.status}`);
  return res.json();
}

export async function saveTvValidation(runId: string, body: { pf?: number; net_pct?: number; max_dd_pct?: number; trades?: number; note?: string }): Promise<void> {
  const res = await fetch(`${BASE}/runs/${encodeURIComponent(runId)}/tv-validation`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`saveTvValidation: ${res.status}`);
}

export function getStreamUrl(): string {
  return `${BASE}/stream`;
}

export function getAiStreamUrl(): string {
  return `${BASE}/ai`;
}

export type PaperAveragesData = {
  n_paper: number; n_valid: number; n_skipped: number;
  avg_pnl: number | null; avg_pnl_pct: number | null;
  avg_max_drawdown_pct: number | null; avg_win_rate: number | null; avg_profit_factor: number | null;
};

export async function fetchPaperAverages(): Promise<PaperAveragesData> {
  const res = await fetch(`${BASE}/paper-trader/averages`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchPaperAverages: ${res.status}`);
  return res.json();
}

export type PaperLiveAveragesData = {
  n_paper: number; n_with_trades: number; n_trades: number;
  total_pnl: number | null; win_rate: number | null; profit_factor: number | null;
  avg_pnl_per_trade: number | null; last_trade_at: string | null;
};

export async function fetchPaperLiveAverages(): Promise<PaperLiveAveragesData> {
  const res = await fetch(`${BASE}/paper-trader/live-averages`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchPaperLiveAverages: ${res.status}`);
  return res.json();
}

export type PnlCell = { pnl: number; trades: number };
export type PnlScope = "scalping" | "swing" | "desk_agent";
export type PaperPnlBreakdownData = {
  scope: PnlScope;
  now_utc: string;
  source_tz: string;
  windows: string[];
  total: Record<string, PnlCell>;
  sessions: { name: string; utc: string; cells: Record<string, PnlCell> }[];
  n_trades_total: number;
};

export async function fetchPaperPnlBreakdown(scope: PnlScope): Promise<PaperPnlBreakdownData> {
  const res = await fetch(`${BASE}/paper-trader/pnl-breakdown?scope=${scope}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchPaperPnlBreakdown: ${res.status}`);
  return res.json();
}

export async function fetchRunPnlBreakdown(runId: string): Promise<PaperPnlBreakdownData> {
  const res = await fetch(`${BASE}/runs/${encodeURIComponent(runId)}/pnl-breakdown`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchRunPnlBreakdown: ${res.status}`);
  return res.json();
}

export async function postAiPrompt(runId: string, prompt: string): Promise<Response> {
  return fetch(`${BASE}/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run_id: runId, prompt }),
  });
}

export interface Suggestion {
  id: string;
  run_id: string;
  saved_at: string;
  prompt: string;
  response: string;
  template?: string;
}

export async function fetchSuggestions(runId: string): Promise<Suggestion[]> {
  const res = await fetch(`${BASE}/runs/${encodeURIComponent(runId)}/suggestions`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function saveSuggestion(runId: string, prompt: string, response: string, template?: string): Promise<void> {
  await fetch(`${BASE}/runs/${encodeURIComponent(runId)}/suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, response, template }),
  });
}

export async function deleteSuggestion(runId: string, suggestionId: string): Promise<void> {
  await fetch(`${BASE}/runs/${encodeURIComponent(runId)}/suggestions/${suggestionId}`, {
    method: "DELETE",
  });
}


export type Destination = "rd" | "paper" | "broker" | "propfirm" | "challenge_z";

export interface ActivateResponse {
  ok: boolean;
  run_id: string;
  previous_stage: string;
  deployment_stage: string;
  activated_at: string;
}

export async function activateRun(runId: string, destination: Destination): Promise<ActivateResponse> {
  const res = await fetch(`${BASE}/runs/${encodeURIComponent(runId)}/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`activateRun failed (${res.status}): ${errText}`);
  }
  return res.json();
}


// ─── Paper Trader Native (S59 Phase B) ──────────────────────────────────────
export interface PaperState {
  in_position: boolean;
  entry_price: number | null;
  entry_bar_ts: string | null;
  sl: number | null;
  tp: number | null;
  capital: number;
  trade_count: number;
  wins: number;
  losses: number;
  total_pnl: number;
  last_signal_ts: string | null;
}

export interface PaperTrade {
  entry_ts: string;
  exit_ts: string;
  direction: string;
  entry_price: number;
  exit_price: number;
  sl?: number;  // S61 — niveau SL prévu à l'entrée
  tp?: number;  // S61 — niveau TP prévu à l'entrée
  qty: number;
  pnl: number;
  exit_reason: string;
  logged_at: string;
}

export interface PaperData {
  run_id: string;
  state: PaperState | null;
  trades: PaperTrade[];
  has_data: boolean;
}

export async function paperTraderStart(runId: string): Promise<{ ok: boolean; pid?: number; already_running?: boolean; error?: string }> {
  const res = await fetch(`${BASE}/paper-trader/${encodeURIComponent(runId)}/start`, { method: "POST" });
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`paperTraderStart (${res.status}): ${txt}`);
  }
  return res.json();
}

export async function paperTraderStop(runId: string): Promise<{ ok: boolean; stopped?: boolean }> {
  const res = await fetch(`${BASE}/paper-trader/${encodeURIComponent(runId)}/stop`, { method: "POST" });
  if (!res.ok) throw new Error(`paperTraderStop ${res.status}`);
  return res.json();
}

export async function paperTraderStatus(runId: string): Promise<{ run_id: string; running: boolean; pid_info?: object; state?: PaperState; trades_count?: number; last_trade?: object }> {
  const res = await fetch(`${BASE}/paper-trader/${encodeURIComponent(runId)}/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(`paperTraderStatus ${res.status}`);
  return res.json();
}

export async function fetchPaperData(runId: string): Promise<PaperData> {
  const res = await fetch(`${BASE}/runs/${encodeURIComponent(runId)}/paper-data`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchPaperData ${res.status}`);
  return res.json();
}

export async function paperTraderList(): Promise<{ run_id: string; pid: number; error_state?: boolean; consecutive_errors?: number; last_error_msg?: string; last_error_ts?: string }[]> {
  const res = await fetch(`${BASE}/paper-trader/list`, { cache: "no-store" });
  if (!res.ok) throw new Error(`paperTraderList ${res.status}`);
  return res.json();
}

export async function fetchLivePrice(symbol: string): Promise<{ ok: boolean; symbol?: string; yf_symbol?: string; price?: number; change_pct?: number; ts?: string; error?: string }> {
  const res = await fetch(`${BASE}/price/${encodeURIComponent(symbol)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchLivePrice ${res.status}`);
  return res.json();
}

export type LiveBar = { time: number; open: number; high: number; low: number; close: number; volume: number };
export async function fetchLiveBars(symbol: string, tf: string, limit: number = 200): Promise<{ ok: boolean; symbol?: string; tf?: string; bars?: LiveBar[]; error?: string }> {
  const res = await fetch(`${BASE}/live-bars/${encodeURIComponent(symbol)}/${encodeURIComponent(tf)}?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchLiveBars ${res.status}`);
  return res.json();
}

export type IndicatorPoint = { time: number; value: number };
export type LiveIndicators = {
  ok: boolean;
  symbol?: string;
  tf?: string;
  indicators?: {
    ema?: { length: number; points: IndicatorPoint[] };
    emas?: Array<{ length: number; points: IndicatorPoint[] }>;
    bb?: { length: number; mult: number; upper: IndicatorPoint[]; middle: IndicatorPoint[]; lower: IndicatorPoint[] };
    avwap?: { anchored_at: number; points: IndicatorPoint[] };
    rsi?: { length: number; points: IndicatorPoint[] };
    volume_profile?: { sessions: { session_date: string; session_ts: number; poc: number; vah: number; val: number; high: number; low: number }[] };
  };
  error?: string;
};
export async function fetchLiveIndicators(symbol: string, tf: string, opts: { ema?: number; emas?: string; bb_length?: number; bb_mult?: number; rsi_length?: number; avwap?: boolean; volume_profile?: boolean } = {}, limit: number = 200): Promise<LiveIndicators> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (opts.ema) params.set("ema", String(opts.ema));
  if (opts.emas) params.set("emas", opts.emas);
  if (opts.bb_length) { params.set("bb_length", String(opts.bb_length)); params.set("bb_mult", String(opts.bb_mult ?? 2)); }
  if (opts.rsi_length) params.set("rsi_length", String(opts.rsi_length));
  if (opts.avwap) params.set("avwap", "true");
  if (opts.volume_profile) params.set("volume_profile", "true");
  const res = await fetch(`${BASE}/live-indicators/${encodeURIComponent(symbol)}/${encodeURIComponent(tf)}?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchLiveIndicators ${res.status}`);
  return res.json();
}
