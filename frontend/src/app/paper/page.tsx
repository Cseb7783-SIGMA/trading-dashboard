"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FlaskConical, ChevronRight, Check, Clock, AlertTriangle, ArrowRight, Search, X, Square } from "lucide-react";
import { useRuns } from "@/hooks/useRuns";
import { paperTraderList, fetchPaperData } from "@/lib/api";
import type { Run } from "@/lib/types";
import PaperPauseControl from "@/components/layout/PaperPauseControl";
import DeskAgentTab from "@/components/desk/DeskAgentTab";
import PaperAverages from "@/components/strategy/PaperAverages";
import PaperPnlBreakdown from "@/components/strategy/PaperPnlBreakdown";

type PaperStrategy = {
  id: string;
  name: string;
  version: string;
  instrument: string;
  timeframe: string;
  style: "scalping" | "swing";
  paperDays: number;
  tradesPaper: number;
  tradesRequired: number;
  tradesToday?: number;
  lastTradeTs?: string | null;
  pf_backtest: number;
  pf_paper: number | null;
  pf_delta_pct: number | null;
  wr_backtest: number;
  wr_paper: number | null;
  rr_backtest: number;
  rr_paper: number | null;
  dd_backtest: number;
  dd_paper: number | null;
  status: "confirmed" | "in_progress" | "drift" | "stopped";
};

// Stratégies actuellement en Paper Trade
// TODO: brancher sur backend /paper-runs (Phase 2 D-033)
// MOCK fallback (non utilisé — kept for reference)
const PAPER_STRATEGIES_MOCK: PaperStrategy[] = [
  {
    id: "2026-05-30T151816Z__f10_v1a_avwap_rr3_qqq_15m__s57",
    name: "F10 V1A×AVWAP RR3",
    version: "v1.A-RR3",
    instrument: "QQQ", timeframe: "15m", style: "scalping",
    paperDays: 12, tradesPaper: 9, tradesRequired: 15,
    pf_backtest: 2.10, pf_paper: 1.95, pf_delta_pct: -7,
    wr_backtest: 46.6, wr_paper: 44.4,
    dd_backtest: -0.7, dd_paper: -1.1,
    status: "confirmed",
  },
  {
    id: "2026-05-30T151817Z__v1a_voldelta_rr3_qqq_15m__s57",
    name: "V1A × VolDelta RR3",
    version: "v1.A-VD",
    instrument: "QQQ", timeframe: "15m", style: "scalping",
    paperDays: 6, tradesPaper: 3, tradesRequired: 15,
    pf_backtest: 1.66, pf_paper: null, pf_delta_pct: null,
    wr_backtest: 48.0, wr_paper: null,
    dd_backtest: -1.2, dd_paper: null,
    status: "in_progress",
  },
  {
    id: "2026-05-28T120000Z__f1_v1e_qqq_range__s53",
    name: "F1 V1.E QQQ range AND",
    version: "v1.E",
    instrument: "QQQ", timeframe: "15m", style: "scalping",
    paperDays: 28, tradesPaper: 8, tradesRequired: 15,
    pf_backtest: 3.67, pf_paper: 0.85, pf_delta_pct: -77,
    wr_backtest: 50.0, wr_paper: 25.0,
    dd_backtest: -1.5, dd_paper: -3.8,
    status: "drift",
  },
];

const MEDAL: Record<number, { label: string; color: string }> = {
  1: { label: "1st", color: "text-yellow-400" },
  2: { label: "2nd", color: "text-slate-400"  },
  3: { label: "3rd", color: "text-orange-400" },
};

function StatusBadge({ status }: { status: PaperStrategy["status"] }) {
  // S62 Option D — Texte sec coloré (point + label, sans bordure ni padding)
  const config = {
    stopped:     { color: "#dc2626", label: "Arrêtée", icon: "●", tooltip: "Paper trader arrêté — aucun signal n'est évalué" },
    confirmed:   { color: "#16a34a", label: "Confirmée", icon: "●", tooltip: "Stratégie confirmée — KPIs Paper alignés avec Backtest" },
    in_progress: { color: "#16a34a", label: "Active", icon: "●", tooltip: "Paper trader actif — signaux évalués en continu" },
    drift:       { color: "#f59e0b", label: "Drift", icon: "●", tooltip: "Drift détecté — KPIs Paper divergent du Backtest" },
  }[status] || { color: "#6b7280", label: "Inconnu", icon: "●", tooltip: "Statut inconnu" };
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap cursor-help"
      style={{ color: config.color }}
      title={config.tooltip}
    >
      <span className="text-[9px] leading-none">{config.icon}</span>
      {config.label}
    </span>
  );
}

function ActionButton({ status, name }: { status: PaperStrategy["status"]; name: string }) {
  if (status === "confirmed") {
    return (
      <button
        onClick={() => alert(`Modal 'Transférer vers...' pour ${name} — à venir UX7`)}
        className="text-xs font-medium px-2.5 py-1 rounded bg-blue/15 border border-blue/40 text-blue hover:bg-blue/25 transition-colors whitespace-nowrap inline-flex items-center gap-1"
      >
        Transférer vers… <ArrowRight size={10} />
      </button>
    );
  }
  if (status === "drift") {
    return (
      <button
        onClick={() => alert(`Pause + investiguer ${name} — à venir UX7`)}
        className="text-xs font-medium px-2.5 py-1 rounded bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-colors whitespace-nowrap inline-flex items-center gap-1"
      >
        Pause + investiguer <ArrowRight size={10} />
      </button>
    );
  }
  // Status in_progress ou stopped : bouton "Voir détail" → page strategy
  return (
    <a
      href={`/strategy/${encodeURIComponent(name)}`}
      className="text-xs font-medium px-2.5 py-1 rounded bg-ink border border-border text-muted hover:text-text hover:border-border/80 transition-colors whitespace-nowrap inline-flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      Voir détail <ArrowRight size={10} />
    </a>
  );
}


// S61 — Calcule les KPIs Paper (PF/WR/RR/DD) à partir de la liste des trades fermés
type PaperKpis = { pf: number | null; wr: number | null; rr: number | null; dd: number | null };
function computeKpisFromTrades(trades: { pnl: number }[], initialCapital = 10000): PaperKpis {
  if (!trades || trades.length === 0) return { pf: null, wr: null, rr: null, dd: null };
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const totalWin = wins.reduce((s, t) => s + t.pnl, 0);
  const totalLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const pf = totalLoss > 0 ? totalWin / totalLoss : (totalWin > 0 ? 999 : 0);
  const wr = (wins.length / trades.length) * 100;
  const avgWin = wins.length > 0 ? totalWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
  const rr = avgLoss > 0 ? avgWin / avgLoss : 0;
  let peak = 0, cumPnl = 0, maxDD = 0;
  for (const t of trades) {
    cumPnl += t.pnl;
    if (cumPnl > peak) peak = cumPnl;
    const dd = cumPnl - peak;
    if (dd < maxDD) maxDD = dd;
  }
  const ddPct = (maxDD / initialCapital) * 100;
  return { pf, wr, rr, dd: ddPct };
}

// Convertit un Run avec deployment_stage="paper" en PaperStrategy
function runToPaperStrategy(run: Run): PaperStrategy {
  const tf = (run.universe.timeframe ?? "").toLowerCase();
  const tfMinutes = (() => {
    const m = tf.match(/^(\d+)(m|min|h|hour|d|day|w|week)?/);
    if (!m) return 60;
    const n = parseInt(m[1] || "0");
    const unit = m[2] || "m";
    if (unit.startsWith("h")) return n * 60;
    if (unit.startsWith("d")) return n * 60 * 24;
    if (unit.startsWith("w")) return n * 60 * 24 * 7;
    return n;
  })();
  const style: "scalping" | "swing" = tfMinutes <= 30 ? "scalping" : "swing";

  const k = run.kpis;
  return {
    id: run.run_id,
    name: run.strategy.name,
    version: run.strategy.version,
    instrument: run.universe.instrument,
    timeframe: run.universe.timeframe,
    style,
    tier_davey: run.d033?.tier_davey,
    tags: run.tags || [],
    created_at: run.created_at,
    paperDays: 0,
    tradesPaper: 0,
    tradesRequired: style === "scalping" ? 100 : 30,
    pf_backtest: k.profit_factor ?? 0,
    pf_paper: null,
    pf_delta_pct: null,
    wr_backtest: (k.win_rate ?? 0) * (k.win_rate && k.win_rate <= 1 ? 100 : 1),
    wr_paper: null,
    rr_backtest: k.avg_win_loss_ratio ?? 0,
    rr_paper: null,
    dd_backtest: k.max_drawdown_pct ?? 0,
    dd_paper: null,
    status: "in_progress",
  };
}

export default function PaperTradePage() {
  const [tab, setTab] = useState<"scalping" | "swing" | "desk_agent">("scalping");
  const [query, setQuery] = useState("");
  // S61 — Tri par colonne (null = tri par défaut Option C)
  type SortColumn = "pf" | "wr" | "rr" | "dd" | "sample" | null;
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const handleSort = (col: Exclude<SortColumn, null>) => {
    if (sortColumn === col) {
      // Toggle direction
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortColumn(col);
      // DD : moins = mieux donc asc par défaut. Autres : desc.
      setSortDir(col === "dd" ? "asc" : "desc");
    }
  };
  const resetSort = () => { setSortColumn(null); setSortDir("desc"); };
  const { runs, loading } = useRuns();
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [errorTraders, setErrorTraders] = useState<{ run_id: string; consecutive_errors?: number; last_error_msg?: string; last_error_ts?: string }[]>([]);
  const [systemHealth, setSystemHealth] = useState<{ green: number; yellow: number; red: number; total_paper_runs: number; runs: Array<{ run_id: string; strategy: string; status: string; issues: Array<{ severity: string; code: string; msg: string; sample?: string }> }> } | null>(null);
  const [activity, setActivity] = useState<{
    total_trades_today: number;
    active_runs_count: number;
    runs_with_trades_today?: number;
    last_trade_global: { run_id: string; ts: string; exit_reason?: string; pnl?: string } | null;
    by_run: Record<string, { trades_today: number; trades_total: number; last_trade_ts: string | null }>;
  } | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  // S61 — KPIs Paper calculés depuis les trades CSV (PF/WR/RR/DD par run)
  const [paperKpisByRun, setPaperKpisByRun] = useState<Record<string, PaperKpis>>({});

  // T-45 v2 — Fetch system-health + polling 60s
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    async function refreshHealth() {
      try {
        const r = await fetch(`${API}/system-health`);
        const data = await r.json();
        if (data && typeof data.total_paper_runs === "number") setSystemHealth(data);
      } catch {}
    }
    refreshHealth();
    const iv = setInterval(refreshHealth, 60000);
    return () => clearInterval(iv);
  }, []);

  // Fetch activity + polling 60s
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    async function refreshActivity() {
      try {
        const r = await fetch(`${API}/paper-trader/activity`);
        const data = await r.json();
        setActivity(data);
        setLastRefresh(new Date());
      } catch {}
    }
    refreshActivity();
    const iv = setInterval(refreshActivity, 60000);
    return () => clearInterval(iv);
  }, []);

  // Fetch running paper traders + polling 30s
  useEffect(() => {
    async function refreshRunning() {
      try {
        const list = await paperTraderList();
        setRunningIds(new Set(list.map((r) => r.run_id)));
        setErrorTraders(list.filter((r) => r.error_state).map((r) => ({
          run_id: r.run_id,
          consecutive_errors: r.consecutive_errors,
          last_error_msg: r.last_error_msg,
          last_error_ts: r.last_error_ts,
        })));
      } catch {
        setRunningIds(new Set());
        setErrorTraders([]);
      }
    }
    refreshRunning();
    const iv = setInterval(refreshRunning, 30000);
    return () => clearInterval(iv);
  }, []);

  // S61 — Fetch KPIs Paper pour tous les runs paper en parallèle + polling 60s
  useEffect(() => {
    const paperRunIds = runs
      .filter((r) => r.d033?.deployment_stage === "paper")
      .map((r) => r.run_id);
    if (paperRunIds.length === 0) return;
    async function fetchAllKpis() {
      try {
        const results = await Promise.all(
          paperRunIds.map(async (id) => {
            try {
              const data = await fetchPaperData(id);
              return [id, computeKpisFromTrades(data.trades || [])] as const;
            } catch {
              return [id, { pf: null, wr: null, rr: null, dd: null }] as const;
            }
          })
        );
        setPaperKpisByRun(Object.fromEntries(results));
      } catch {}
    }
    fetchAllKpis();
    const iv = setInterval(fetchAllKpis, 60000);
    return () => clearInterval(iv);
  }, [runs]);

  // PAPER_STRATEGIES = runs avec deployment_stage === "paper" (vraies données live)
  // Status override : si flag paper MAIS process pas dans runningIds → "stopped"
  // Enrichi avec trades_today depuis activity endpoint
  const PAPER_STRATEGIES: PaperStrategy[] = runs
    .filter((r) => r.d033?.deployment_stage === "paper")
    .map(runToPaperStrategy)
    .map((s) => {
      const act = activity?.by_run?.[s.id];
      const trades_today = act?.trades_today ?? 0;
      const trades_total = act?.trades_total ?? 0;
      // S61 — KPIs Paper live depuis trades CSV
      const kpis = paperKpisByRun[s.id];
      const pf_paper = kpis?.pf ?? null;
      const wr_paper = kpis?.wr ?? null;
      const rr_paper = kpis?.rr ?? null;
      const dd_paper = kpis?.dd ?? null;
      const pf_delta_pct = (pf_paper !== null && s.pf_backtest > 0)
        ? ((pf_paper - s.pf_backtest) / s.pf_backtest) * 100
        : null;
      // S62 — paperDays = jours calendaires depuis dernier trade (1j = hier)
      const referenceTs = act?.last_trade_ts || s.created_at;
      let paperDays = 0;
      if (referenceTs) {
        const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(referenceTs);
        const lastDate = new Date(hasTz ? referenceTs : referenceTs + "Z");
        const lastMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime();
        const todayMidnight = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
        paperDays = Math.max(0, Math.round((todayMidnight - lastMidnight) / (1000 * 60 * 60 * 24)));
      }
      return {
        ...s,
        status: runningIds.has(s.id) ? s.status : "stopped",
        tradesPaper: trades_total,
        tradesToday: trades_today,
        lastTradeTs: act?.last_trade_ts || null,
        paperDays,
        pf_paper,
        wr_paper,
        rr_paper,
        dd_paper,
        pf_delta_pct,
      };
    });

  const q = query.trim().toLowerCase();
  const matchesQuery = (s: PaperStrategy) => {
    if (!q) return true;
    const hay = `${s.name} ${s.version} ${s.instrument} ${s.timeframe}`.toLowerCase();
    return hay.includes(q);
  };
  // S61 — Tri : par colonne cliquée OU Option C par défaut (Validé d'abord)
  const filtered = PAPER_STRATEGIES.filter((s) => s.style === tab && matchesQuery(s))
    .sort((a, b) => {
      // Si une colonne est triée explicitement, prendre cette valeur
      if (sortColumn !== null) {
        const getVal = (s: PaperStrategy): number => {
          switch (sortColumn) {
            case "pf": return s.pf_paper ?? -Infinity;
            case "wr": return s.wr_paper ?? -Infinity;
            case "rr": return s.rr_paper ?? -Infinity;
            case "dd": return s.dd_paper ?? -Infinity;
            case "sample": return s.tradesPaper;
            default: return 0;
          }
        };
        const av = getVal(a);
        const bv = getVal(b);
        return sortDir === "desc" ? bv - av : av - bv;
      }
      // Tri Option C par défaut
      const aValid = a.tradesPaper >= a.tradesRequired ? 1 : 0;
      const bValid = b.tradesPaper >= b.tradesRequired ? 1 : 0;
      if (aValid !== bValid) return bValid - aValid;
      const aPaper = a.pf_paper ?? -Infinity;
      const bPaper = b.pf_paper ?? -Infinity;
      if (aPaper !== bPaper) return bPaper - aPaper;
      const aToday = (a as PaperStrategy).tradesToday || 0;
      const bToday = (b as PaperStrategy).tradesToday || 0;
      if (aToday !== bToday) return bToday - aToday;
      return (b.pf_backtest || 0) - (a.pf_backtest || 0);
    });
  const counts = {
    scalping: PAPER_STRATEGIES.filter((s) => s.style === "scalping" && matchesQuery(s)).length,
    swing: PAPER_STRATEGIES.filter((s) => s.style === "swing" && matchesQuery(s)).length,
  };

  const stats = {
    total: PAPER_STRATEGIES.length,
    confirmed: PAPER_STRATEGIES.filter((s) => s.status === "confirmed").length,
    inProgress: PAPER_STRATEGIES.filter((s) => s.status === "in_progress").length,
    drift: PAPER_STRATEGIES.filter((s) => s.status === "drift").length,
    totalTrades: PAPER_STRATEGIES.reduce((acc, s) => acc + s.tradesPaper, 0),
  };

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="text-[11px] text-muted">
        <Link href="/" className="text-blue hover:underline">Laboratoire</Link>
        <ChevronRight size={11} className="inline mx-1 opacity-40" />
        <span>Paper Trade</span>
      </nav>

      {/* Header avec contrôle Pause/Reprendre tous */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FlaskConical size={22} className="text-blue" />
            <h1 className="text-xl font-semibold">Paper Trade</h1>
          </div>
          <p className="text-xs text-muted mt-0.5">Validation forward live — est-ce que la réalité confirme le backtest ?</p>
        </div>
        <div className="w-64">
          <PaperPauseControl />
        </div>
      </div>

      {/* Bannière explicative — différencier Paper Trade vs Laboratoire */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-700 text-xs shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-xl">📊</span>
          <div className="flex-1">
            <div className="font-bold text-blue-900 dark:text-blue-200 text-sm mb-1">Phase 2 — Paper Trade (Validation forward live)</div>
            <div className="text-blue-800 dark:text-blue-300 mt-1">
              <span className="font-semibold">Objectif</span> : prouver que les chiffres du backtest se reproduisent en <span className="font-semibold">temps réel</span>. Les stratégies tradent sur prix yfinance live (capital fictif $10k) pour accumuler un échantillon de trades forward.
            </div>
            <div className="text-blue-800 dark:text-blue-300 mt-2">
              <span className="font-semibold">Critère de succès</span> : delta PF Paper vs Backtest ≥ −20% avec ≥ 100 trades (scalping) ou ≥ 30 trades (swing) → stratégie <strong>Confirmée</strong>.
            </div>
            <div className="text-blue-800 dark:text-blue-300 mt-2">
              <span className="font-semibold">Prochaine étape</span> → quand Confirmée, transférer vers <strong>Personal Broker / PropFirm / Challenge Z</strong> (capital réel engagé).
            </div>
          </div>
        </div>
      </div>

      {/* T-45 v2 — Widget System Health (audit automatique tous les paper traders) */}
      {systemHealth && (
        <div className={`p-3 rounded-lg border-2 text-xs shadow-sm ${
          systemHealth.red > 0
            ? "bg-red-50 dark:bg-red-950/30 border-red-400"
            : systemHealth.yellow > 0
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300"
              : "bg-green-50 dark:bg-green-950/30 border-green-400"
        }`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-lg">🩺</span>
              <div>
                <div className={`font-semibold text-sm ${
                  systemHealth.red > 0 ? "text-red-900 dark:text-red-200"
                    : systemHealth.yellow > 0 ? "text-amber-900 dark:text-amber-200"
                    : "text-green-900 dark:text-green-200"
                }`}>
                  System Health — {systemHealth.green}/{systemHealth.total_paper_runs} OK
                  {systemHealth.yellow > 0 && <> · 🟡 {systemHealth.yellow}</>}
                  {systemHealth.red > 0 && <> · 🔴 {systemHealth.red}</>}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Audit automatique : instrument mappable · strategy registered · module importable · log récent · pas d&apos;erreurs récentes
                </div>
              </div>
            </div>
          </div>
          {systemHealth.runs.filter(r => r.status === "RED").length > 0 && (
            <div className="mt-2 space-y-1">
              {systemHealth.runs.filter(r => r.status === "RED").map(r => (
                <div key={r.run_id} className="p-2 rounded bg-white/60 dark:bg-black/30 border border-red-300 text-[11px]">
                  <div className="font-mono text-red-900 dark:text-red-300 truncate">{r.strategy}</div>
                  {r.issues.filter(i => i.severity === "CRITICAL").map((iss, idx) => (
                    <div key={idx} className="text-red-800 dark:text-red-400 mt-0.5">
                      <span className="font-semibold">[{iss.code}]</span> {iss.msg}
                      {iss.sample && <div className="font-mono text-[10px] opacity-70 mt-0.5">{iss.sample}</div>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* T-45 : Bannière ROUGE — paper traders en erreur (au moins 3 ticks erronés) */}
      {errorTraders.length > 0 && (
        <div className="p-4 rounded-lg bg-red-100 dark:bg-red-950/40 border-2 border-red-500 text-xs shadow-md animate-pulse">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚨</span>
            <div className="flex-1">
              <div className="font-bold text-red-900 dark:text-red-200 text-sm mb-1">
                ALERTE — {errorTraders.length} paper trader{errorTraders.length > 1 ? "s" : ""} en erreur
              </div>
              <div className="text-red-800 dark:text-red-300 text-[11px] mb-2">
                Ces stratégies n'évaluent plus les signaux — trades manqués potentiels. Action requise.
              </div>
              <div className="space-y-1.5">
                {errorTraders.map((e) => (
                  <div key={e.run_id} className="p-2 rounded bg-white/60 dark:bg-black/30 border border-red-300">
                    <div className="font-mono text-[10px] text-red-900 dark:text-red-300 truncate">{e.run_id}</div>
                    <div className="text-red-800 dark:text-red-400 text-[11px] mt-0.5">
                      <span className="font-semibold">{e.consecutive_errors ?? "?"} erreurs consécutives</span>
                      {e.last_error_msg && <> · <span className="font-mono">{e.last_error_msg}</span></>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bannière activité du jour — auto-refresh 60s */}
      {(() => {
        const total = activity?.total_trades_today ?? 0;
        const activeRuns = activity?.active_runs_count ?? 0;
        const last = activity?.last_trade_global ?? null;
        const refreshStr = lastRefresh.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
        const runsTraded = activity?.runs_with_trades_today ?? 0;
        if (total > 0) {
          return (
            <div className="p-4 rounded-lg bg-green-100 dark:bg-green-950/40 border-2 border-green-400 dark:border-green-600 text-xs shadow-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🟢</span>
                  <div>
                    <div className="font-semibold text-green-800">
                      {total} trade{total > 1 ? "s" : ""} aujourd'hui sur {runsTraded} stratégie{runsTraded > 1 ? "s" : ""}
                    </div>
                    {last && (
                      <div className="text-green-700 text-[11px] mt-0.5">
                        Dernier trade : {new Date(last.ts).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                        {last.exit_reason && <> · {last.exit_reason}</>}
                        {last.pnl && <> · PnL {last.pnl}</>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-green-600">🔄 {refreshStr}</div>
              </div>
            </div>
          );
        }
        return (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700 text-xs shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏳</span>
                <div>
                  <div className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                    Aucun trade aujourd'hui
                  </div>
                  <div className="text-amber-800 dark:text-amber-300 mt-0.5">
                    {activeRuns} paper trader{activeRuns > 1 ? "s" : ""} en surveillance — la bannière passera en vert dès qu'un trade déclenche
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">🔄 {refreshStr}</div>
            </div>
          </div>
        );
      })()}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Stratégies en paper</div>
          <div className="text-lg font-semibold">{stats.total}</div>
          <div className="text-[10px] text-muted/70 mt-0.5">{stats.confirmed} confirmée · {stats.inProgress} en cours · {stats.drift} drift</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Trades paper total</div>
          <div className="text-lg font-semibold">{stats.totalTrades}</div>
          <div className="text-[10px] text-muted/70 mt-0.5">depuis activation</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">P&L paper agrégé</div>
          <div className="text-lg font-semibold text-muted">—</div>
          <div className="text-[10px] text-muted/70 mt-0.5">en attente trades</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Prêtes à transférer</div>
          <div className="text-lg font-semibold">{stats.confirmed}</div>
          <div className="text-[10px] text-muted/70 mt-0.5">{stats.confirmed === 0 ? "aucune confirmée" : "voir détails"}</div>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une stratégie (nom, version, asset, timeframe)…"
          className="w-full bg-surface border border-border rounded-lg text-sm text-text pl-9 pr-9 py-2 focus:border-blue/60 focus:outline-none placeholder:text-muted"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text p-1"
            aria-label="Effacer la recherche"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <PaperAverages />

      {/* Tabs Scalping / Swing */}
      <div className="flex items-center gap-0 border-b border-border">
        <button
          onClick={() => setTab("scalping")}
          className={`text-sm px-4 py-2 -mb-px border-b-2 transition-colors ${
            tab === "scalping" ? "border-blue text-blue font-medium" : "border-transparent text-muted hover:text-text"
          }`}
        >
          Scalping <span className="text-muted font-normal">({counts.scalping})</span>
        </button>
        <button
          onClick={() => setTab("swing")}
          className={`text-sm px-4 py-2 -mb-px border-b-2 transition-colors ${
            tab === "swing" ? "border-blue text-blue font-medium" : "border-transparent text-muted hover:text-text"
          }`}
        >
          Swing <span className="text-muted font-normal">({counts.swing})</span>
        </button>
        <button
          onClick={() => setTab("desk_agent")}
          className={`text-sm px-4 py-2 -mb-px border-b-2 transition-colors ${
            tab === "desk_agent" ? "border-blue text-blue font-medium" : "border-transparent text-muted hover:text-text"
          }`}
        >
          Desk Agent
        </button>
        {/* S61 — Bouton reset tri (visible seulement si tri custom actif) */}
        {sortColumn !== null && (
          <button
            onClick={resetSort}
            className="ml-auto text-[11px] text-muted hover:text-text px-2 py-1 border border-border rounded mr-2 mb-1"
            title="Revenir au tri par défaut (Validé d'abord)"
          >
            ✕ Reset tri
          </button>
        )}
      </div>

      <PaperPnlBreakdown key={tab} scope={tab} />

      {/* Table */}
      {filtered.length === 0 ? (
        tab === "desk_agent" ? (
          <DeskAgentTab />
        ) : (
        <div className="bg-surface border border-border border-dashed rounded-lg p-8 text-center text-xs text-muted">
          Aucune stratégie {tab === "scalping" ? "scalping" : "swing"} en paper actuellement.
        </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 w-10">#</th>
                <th className="text-left px-4 py-3">Stratégie</th>
                <th className="text-left px-4 py-3">Univers</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-right px-4 py-3 cursor-pointer hover:text-text select-none" onClick={() => handleSort("pf")} title="Trier par PF Paper">
                  PF Paper {sortColumn === "pf" && <span className="ml-0.5">{sortDir === "desc" ? "↓" : "↑"}</span>}
                </th>
                <th className="text-right px-4 py-3 cursor-pointer hover:text-text select-none" onClick={() => handleSort("wr")} title="Trier par WR Paper">
                  WR Paper {sortColumn === "wr" && <span className="ml-0.5">{sortDir === "desc" ? "↓" : "↑"}</span>}
                </th>
                <th className="text-right px-4 py-3 cursor-pointer hover:text-text select-none" onClick={() => handleSort("rr")} title="Trier par RR Paper">
                  RR {sortColumn === "rr" && <span className="ml-0.5">{sortDir === "desc" ? "↓" : "↑"}</span>}
                </th>
                <th className="text-right px-4 py-3 cursor-pointer hover:text-text select-none" onClick={() => handleSort("dd")} title="Trier par DD Paper (asc = meilleur)">
                  DD Paper {sortColumn === "dd" && <span className="ml-0.5">{sortDir === "desc" ? "↓" : "↑"}</span>}
                </th>
                <th className="text-right px-4 py-3 cursor-pointer hover:text-text select-none" onClick={() => handleSort("sample")} title="Trier par nombre de trades">
                  Sample {sortColumn === "sample" && <span className="ml-0.5">{sortDir === "desc" ? "↓" : "↑"}</span>}
                </th>

              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => {
                const rank = idx + 1;
                const deltaColor =
                  s.pf_delta_pct === null ? "text-muted"
                  : s.pf_delta_pct >= -20 ? "text-green-400"
                  : s.pf_delta_pct >= -30 ? "text-amber-400"
                  : "text-red-300";
                return (
                  <tr key={s.id} onClick={() => { window.location.href = `/strategy/${encodeURIComponent(s.id)}`; }} className={`border-b border-border/50 hover:bg-ink transition-colors group cursor-pointer ${(s as any).tradesToday > 0 ? "bg-green-50/30" : ""}`}>
                    <td className="px-4 py-3 text-center">
                      {MEDAL[rank]
                        ? <span className={`text-xs font-semibold tabular-nums ${MEDAL[rank].color}`}>{MEDAL[rank].label}</span>
                        : <span className="text-muted text-xs tabular-nums">{rank}</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/strategy/${encodeURIComponent(s.id)}`} className="block">
                        <div className="font-medium group-hover:text-blue transition-colors flex items-center gap-1.5 flex-wrap">
                          <span>{s.name}</span>
                          <span className="text-muted text-xs font-normal">{s.version}</span>
                          {/* Badge Scout H1 (variantes issues du scout proactif) */}
                          {(() => {
                            const nameLower = s.name.toLowerCase();
                            const isScout = s.tags?.some((t: string) => t.toLowerCase().includes("scout_h") || t.toLowerCase().includes("scout-h"))
                              || nameLower.includes("_short_only")
                              || nameLower.includes("_short_skip_");
                            if (!isScout) return null;
                            // Détecter version d'itération scout (V1 = isolation, V2 = raffinement skip lunch, etc.)
                            let iter = "";
                            if (nameLower.includes("_short_only")) iter = "V1";
                            else if (nameLower.includes("_short_skip_lunch")) iter = "V2";
                            else if (nameLower.includes("_short_skip_")) iter = "V3+";
                            const tooltipBase = "Variante générée automatiquement par le Scout Proactif (T-42). Issue d'une hypothèse détectée sur les paper traders existants.";
                            const tooltipIter = iter === "V1"
                              ? " V1 = isolation du trigger seul (1ère itération scout)."
                              : iter === "V2"
                              ? " V2 = V1 + raffinement (skip Lunch+PM, détecté par stratification intraday)."
                              : iter
                              ? " Raffinement scout au-delà de V2."
                              : "";
                            return (
                              <span
                                title={tooltipBase + tooltipIter}
                                className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-300 cursor-help">
                                💡 SCOUT H1{iter ? ` ${iter}` : ""}
                              </span>
                            );
                          })()}
                          {/* Badge Top PF (rank 1) */}
                          {rank === 1 && (
                            <span
                              title="Meilleur Profit Factor (PF) de toutes les stratégies en paper trade. Classement basé sur PF Backtest ou PF Paper si disponible."
                              className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-300 cursor-help">
                              👑 TOP PF
                            </span>
                          )}
                          {/* Badge HIGH Tier */}
                          {(s.tier_davey === "HIGH" || s.tier_davey === "STATISTICALLY_ROBUST") && (
                            <span
                              title={s.tier_davey === "STATISTICALLY_ROBUST"
                                ? "Tier ROBUST (Davey pipeline 4/4) : PF ≥ 1.5, sample ≥ 50, Walk-Forward + Monte Carlo + OOS Strict tous validés. Niveau le plus élevé."
                                : "Tier HIGH (Davey pipeline 3/4) : PF ≥ 1.5, sample ≥ 50, WR ≥ 50%. Robust statistiquement mais peut avoir un drift WF ou OOS marginal."}
                              className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-300 cursor-help">
                              ⭐ {s.tier_davey === "STATISTICALLY_ROBUST" ? "ROBUST" : "HIGH"}
                            </span>
                          )}
                          {/* Badge Nouveau (< 24h) */}
                          {s.created_at && (Date.now() - new Date(s.created_at).getTime()) < 86_400_000 && (
                            <span
                              title="Stratégie créée dans les dernières 24h. À surveiller : les premiers signaux paper trade sont la première validation forward."
                              className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-300 cursor-help">
                              🆕 NOUVEAU
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold">{s.instrument}</span>
                      <span className="ml-1 text-muted text-xs">{s.timeframe}</span>
                    </td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><StatusBadge status={s.status} />{(s.status === "confirmed" || s.status === "drift") && (<span onClick={(e) => { e.stopPropagation(); }}><ActionButton status={s.status} name={s.name} /></span>)}</div></td>
                    <td className={`px-4 py-3 text-right font-mono ${deltaColor}`}>
                      <div className="flex flex-col items-end leading-tight">
                        {s.pf_paper !== null ? (
                          <span>
                            {s.pf_paper.toFixed(2)}
                            {s.pf_delta_pct !== null && (
                              <span className="text-[10px] ml-1">({s.pf_delta_pct > 0 ? "+" : ""}{s.pf_delta_pct.toFixed(1)}%)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                        <span className="text-[10px] text-muted/60 whitespace-nowrap">(BT {s.pf_backtest.toFixed(2)})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono"><div className="flex flex-col items-end leading-tight">{s.wr_paper !== null ? <span>{s.wr_paper.toFixed(1)}%</span> : <span className="text-muted">—</span>}<span className="text-[10px] text-muted/60 whitespace-nowrap">(BT {s.wr_backtest.toFixed(1)}%)</span></div></td>
                    <td className="px-4 py-3 text-right font-mono"><div className="flex flex-col items-end leading-tight">{s.rr_paper !== null ? <span>{s.rr_paper.toFixed(2)}</span> : <span className="text-muted">—</span>}<span className="text-[10px] text-muted/60 whitespace-nowrap">(BT {s.rr_backtest > 0 ? `1:${s.rr_backtest.toFixed(2)}` : "—"})</span></div></td>
                    <td className="px-4 py-3 text-right font-mono"><div className="flex flex-col items-end leading-tight">{s.dd_paper !== null ? <span>{s.dd_paper.toFixed(1)}%</span> : <span className="text-muted">—</span>}<span className="text-[10px] text-muted/60 whitespace-nowrap">(BT {s.dd_backtest.toFixed(1)}%)</span></div></td>
                    <td className="px-4 py-3 text-right text-xs text-muted">
                      {(s as any).tradesToday > 0 && (
                        <div className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-300 mb-0.5">
                          🟢 {(s as any).tradesToday} aujourd'hui
                        </div>
                      )}
                      <div
                        className="font-mono font-medium"
                        style={{ color: s.tradesPaper >= s.tradesRequired ? "#16a34a" : "#dc2626" }}
                        title={
                          s.tradesPaper >= s.tradesRequired
                            ? `Sample suffisant — KPIs Paper validés statistiquement (${s.tradesRequired} trades requis)`
                            : `Mode test — ${s.tradesRequired - s.tradesPaper} trades restants avant validation statistique`
                        }
                      >
                        {s.tradesPaper}/{s.tradesRequired}
                      </div>
                      <div className="text-[10px] text-muted/70">{s.paperDays}j</div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Info footer */}
      <div className="bg-surface border border-border rounded-lg p-3 text-[11px] text-muted leading-relaxed space-y-1">
        <div>
          ℹ️ <span className="text-text font-medium">Verdicts automatiques (Scalping)</span> :
          Confirmée si delta PF ≥ −20% · En cours si sample &lt; 15 trades · Drift si delta PF ≤ −30%.
        </div>
        <div>
          <span className="text-text font-medium">Transfert ≠ Activation</span> :
          « Transférer vers… » place la stratégie dans Broker Ready / PropFirm Ready / Challenge Z.
          L'activation finale se fait dans la page de destination (humain confirme capital + risk + asset).
        </div>
      </div>
    </main>
  );
}
