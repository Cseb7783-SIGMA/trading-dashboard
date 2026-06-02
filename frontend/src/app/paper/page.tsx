"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FlaskConical, ChevronRight, Check, Clock, AlertTriangle, ArrowRight, Search, X, Square } from "lucide-react";
import { useRuns } from "@/hooks/useRuns";
import { paperTraderList } from "@/lib/api";
import type { Run } from "@/lib/types";
import PaperPauseControl from "@/components/layout/PaperPauseControl";

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
  pf_backtest: number;
  pf_paper: number | null;
  pf_delta_pct: number | null;
  wr_backtest: number;
  wr_paper: number | null;
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
  if (status === "stopped") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-red-500/15 text-red-400 whitespace-nowrap">
        <Square size={10} /> Arrêté
      </span>
    );
  }
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-green-500/15 text-green-300 whitespace-nowrap">
        <Check size={10} /> Confirmée
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 whitespace-nowrap">
        <Clock size={10} /> En cours
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-red-500/15 text-red-300 whitespace-nowrap">
      <AlertTriangle size={10} /> Drift
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
  return (
    <span className="text-[10px] text-muted italic">Sample en cours…</span>
  );
}


// Convertit un Run avec deployment_stage="paper" en PaperStrategy
// Les KPIs paper sont null pour l'instant (les agents LLM ne publient pas encore leurs trades)
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
    dd_backtest: k.max_drawdown_pct ?? 0,
    dd_paper: null,
    status: "in_progress",
  };
}

export default function PaperTradePage() {
  const [tab, setTab] = useState<"scalping" | "swing">("scalping");
  const [query, setQuery] = useState("");
  const { runs, loading } = useRuns();
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  // Fetch running paper traders + polling 30s
  useEffect(() => {
    async function refreshRunning() {
      try {
        const list = await paperTraderList();
        setRunningIds(new Set(list.map((r) => r.run_id)));
      } catch {
        setRunningIds(new Set());
      }
    }
    refreshRunning();
    const iv = setInterval(refreshRunning, 30000);
    return () => clearInterval(iv);
  }, []);

  // PAPER_STRATEGIES = runs avec deployment_stage === "paper" (vraies données live)
  // Status override : si flag paper MAIS process pas dans runningIds → "stopped"
  const PAPER_STRATEGIES: PaperStrategy[] = runs
    .filter((r) => r.d033?.deployment_stage === "paper")
    .map(runToPaperStrategy)
    .map((s) => ({ ...s, status: runningIds.has(s.id) ? s.status : "stopped" }));

  const q = query.trim().toLowerCase();
  const matchesQuery = (s: PaperStrategy) => {
    if (!q) return true;
    const hay = `${s.name} ${s.version} ${s.instrument} ${s.timeframe}`.toLowerCase();
    return hay.includes(q);
  };
  const filtered = PAPER_STRATEGIES.filter((s) => s.style === tab && matchesQuery(s));
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
      <div className="p-3 rounded-lg bg-blue/5 border border-blue/20 text-xs">
        <div className="flex items-start gap-2">
          <span className="text-base">📊</span>
          <div>
            <div className="font-semibold text-blue">Phase 2 — Paper Trade (Validation forward live)</div>
            <div className="text-muted mt-1">
              <span className="font-medium">Objectif</span> : prouver que les chiffres du backtest se reproduisent en <span className="font-medium">temps réel</span>. Les stratégies tradent sur prix yfinance live (capital fictif $10k) pour accumuler un échantillon de trades forward.
            </div>
            <div className="text-muted mt-1.5">
              <span className="font-medium">Critère de succès</span> : delta PF Paper vs Backtest ≥ −20% avec ≥ 100 trades (scalping) ou ≥ 30 trades (swing) → stratégie <strong>Confirmée</strong>.
            </div>
            <div className="text-muted mt-1.5">
              <span className="font-medium">Prochaine étape</span> → quand Confirmée, transférer vers <strong>Personal Broker / PropFirm / Challenge Z</strong> (capital réel engagé).
            </div>
          </div>
        </div>
      </div>

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
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-surface border border-border border-dashed rounded-lg p-8 text-center text-xs text-muted">
          Aucune stratégie {tab === "scalping" ? "scalping" : "swing"} en paper actuellement.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 w-10">#</th>
                <th className="text-left px-4 py-3">Stratégie</th>
                <th className="text-left px-4 py-3">Univers</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-right px-4 py-3">PF Paper</th>
                <th className="text-right px-4 py-3">WR Paper</th>
                <th className="text-right px-4 py-3">DD Paper</th>
                <th className="text-right px-4 py-3">Sample</th>
                <th className="text-right px-4 py-3">Action</th>
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
                  <tr key={s.id} className="border-b border-border/50 hover:bg-ink transition-colors group">
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
                          {(s.tags?.some((t: string) => t.toLowerCase().includes("scout_h") || t.toLowerCase().includes("scout-h"))
                            || s.name.toLowerCase().includes("_short_only")
                            || s.name.toLowerCase().includes("_short_skip_")) && (
                            <span
                              title="Variante générée automatiquement par le Scout Proactif (T-42). Issue d'une hypothèse détectée sur les paper traders existants, ex: isolation d'un trigger très performant."
                              className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-300 cursor-help">
                              💡 SCOUT H1
                            </span>
                          )}
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
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className={`px-4 py-3 text-right font-mono ${deltaColor}`}>
                      {s.pf_paper !== null ? (
                        <>
                          {s.pf_paper.toFixed(2)}
                          {s.pf_delta_pct !== null && (
                            <span className="text-[10px] ml-1">({s.pf_delta_pct > 0 ? "+" : ""}{s.pf_delta_pct}%)</span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">— <span className="text-[10px] text-muted/60">(BT {s.pf_backtest.toFixed(2)})</span></span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{s.wr_paper !== null ? `${s.wr_paper.toFixed(1)}%` : <span className="text-muted">— <span className="text-[10px] text-muted/60">(BT {s.wr_backtest.toFixed(1)}%)</span></span>}</td>
                    <td className="px-4 py-3 text-right font-mono">{s.dd_paper !== null ? `${s.dd_paper.toFixed(1)}%` : <span className="text-muted">— <span className="text-[10px] text-muted/60">(BT {s.dd_backtest.toFixed(1)}%)</span></span>}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted">
                      {s.tradesPaper}/{s.tradesRequired}
                      <div className="text-[10px] text-muted/70">{s.paperDays}j</div>
                    </td>
                    <td className="px-4 py-3 text-right"><ActionButton status={s.status} name={s.name} /></td>
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
