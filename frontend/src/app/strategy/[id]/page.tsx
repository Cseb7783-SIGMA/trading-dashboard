"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Code, ExternalLink, ArrowRight, Hammer, FlaskConical, Briefcase, Building2, Trophy, ChevronDown, AlertTriangle } from "lucide-react";
import { fetchRun } from "@/lib/api";
import type { RunDetail } from "@/lib/types";
import KPICards from "@/components/strategy/KPICards";
import EquityCurve from "@/components/strategy/EquityCurve";
import DrawdownChart from "@/components/strategy/DrawdownChart";
import TradeScatter from "@/components/strategy/TradeScatter";
import RollingMetrics from "@/components/strategy/RollingMetrics";
import TradeTable from "@/components/strategy/TradeTable";
import PriceChart from "@/components/strategy/PriceChart";
import PineModal from "@/components/strategy/PineModal";

export default function StrategyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pineOpen, setPineOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchRun(decodeURIComponent(id))
      .then(setRun)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="h-8 w-64 bg-surface border border-border rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-lg h-24 animate-pulse" />
          ))}
        </div>
        <div className="bg-surface border border-border rounded-lg h-48 animate-pulse" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted text-sm">{error ?? "Run introuvable"}</p>
        <button onClick={() => router.push("/")} className="mt-4 text-xs text-blue hover:underline">
          ← Retour au Laboratoire
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <nav className="text-[11px] text-muted mb-4">
          <button onClick={() => router.push("/")} className="text-blue hover:underline">Laboratoire</button>
          <span className="mx-1 opacity-40">›</span>
          <span>{run.strategy.name}</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-text truncate">
              {run.strategy.name} <span className="text-muted font-normal text-base">{run.strategy.version}</span>
            </h1>
            <p className="text-xs text-muted mt-0.5">
              {run.universe.instrument} · {run.universe.timeframe} · {new Date(run.created_at).toLocaleDateString("fr-CA")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setPineOpen(true)}
              className="px-3 py-1.5 text-xs rounded border border-border hover:border-blue/40 hover:bg-blue/5 transition-colors flex items-center gap-1.5"
            >
              <Code size={13} />
              Voir Pine Script
            </button>
            <button
              onClick={() => setPineOpen(true)}
              className="px-3 py-1.5 text-xs rounded border border-border hover:border-blue/40 hover:bg-blue/5 transition-colors flex items-center gap-1.5"
              title="Ouvre le modal Pine Script avec bouton 'Copy + Open in TV' intégré"
            >
              <ExternalLink size={13} />
              Open in TV
            </button>
            {run.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {run.tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-blue/10 text-blue border border-blue/20">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        {run.notes && <p className="text-xs text-muted mt-2 italic">{run.notes}</p>}
      </div>

      {/* Panneau d'actions — où en est cette stratégie, où peut-elle aller */}
      <ActionPanel run={run} />

      <div className="space-y-4">
        <KPICards kpis={run.kpis} />

        <PriceChart runId={decodeURIComponent(id)} defaultAsset={run.universe.instrument} defaultTf={run.universe.timeframe} />

        <TradeTable trades={run.trades} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EquityCurve trades={run.trades} />
          <DrawdownChart trades={run.trades} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TradeScatter trades={run.trades} />
          <RollingMetrics trades={run.trades} />
        </div>

        {/* Paper Trade overlay — visible si la stratégie est dans le mock Paper */}
        <PaperTradeOverlay runId={decodeURIComponent(id)} />

        {/* Composition de la stratégie — tags library + lien charter */}
        <CompositionPanel run={run} />
      </div>

      <PineModal
        runId={decodeURIComponent(id)}
        isOpen={pineOpen}
        onClose={() => setPineOpen(false)}
        instrument={run.universe.instrument}
      />
    </div>
  );
}


// ActionPanel — affiche le stade courant + destinations éligibles + bouton action principal
function ActionPanel({ run }: { run: RunDetail }) {
  const [skipMenuOpen, setSkipMenuOpen] = useState(false);
  const sections = run.kpis.sections ?? [];
  const k = run.kpis;

  // Détermine le stade actuel
  type Stage = { id: string; label: string; Icon: typeof Hammer; color: string; bg: string };
  let currentStage: Stage;
  if (sections.includes("in_paper_trade")) {
    currentStage = { id: "paper", label: "En Paper Trade", Icon: FlaskConical, color: "text-blue", bg: "bg-blue/15 border-blue/40" };
  } else if (sections.includes("broker_ready")) {
    currentStage = { id: "broker", label: "Broker Ready", Icon: Briefcase, color: "text-purple-300", bg: "bg-purple-500/15 border-purple-400/40" };
  } else {
    currentStage = { id: "atelier", label: "Atelier", Icon: Hammer, color: "text-muted", bg: "bg-surface border-border" };
  }

  // Détermine les destinations éligibles (heuristique frontend en attendant backend D-033)
  // Règle business (validée S58) : Personal Broker = TES règles (souples), donc une stratégie
  // qui passe les contraintes externes dures (Challenge Z / PropFirm) passe forcément Broker.
  type Eligibility = { id: string; label: string; Icon: typeof Briefcase; color: string };
  const propfirmEligible   = k.prop_score >= 4 && k.total_trades >= 100 && k.max_drawdown_pct <= 10;
  const challengeZEligible = k.challenge_z_score >= 3 && k.total_trades >= 50;
  const brokerBaseline     = k.composite_score >= 70 && k.total_trades >= 50;
  const brokerEligible     = brokerBaseline || propfirmEligible || challengeZEligible;

  const eligibilities: Eligibility[] = [];
  if (brokerEligible)     eligibilities.push({ id: "broker",      label: "Personal Broker",     Icon: Briefcase,  color: "text-purple-300" });
  if (propfirmEligible)   eligibilities.push({ id: "propfirm",    label: "PropFirm FTMO",       Icon: Building2,  color: "text-green-400"  });
  if (challengeZEligible) eligibilities.push({ id: "challenge_z", label: "Challenge Z TMAFX",   Icon: Trophy,     color: "text-amber-400"  });

  const isInPaper = currentStage.id === "paper";
  const StageIcon = currentStage.Icon;

  return (
    <div className="mb-6 p-4 rounded-lg border border-border bg-surface">
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-muted uppercase tracking-wider">Stade actuel</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${currentStage.bg} ${currentStage.color}`}>
              <StageIcon size={12} /> {currentStage.label}
            </span>
          </div>
          {eligibilities.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted uppercase tracking-wider">Éligible pour</span>
              {eligibilities.map((e) => {
                const EIcon = e.Icon;
                return (
                  <span key={e.id} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-ink border border-border ${e.color}`}>
                    <EIcon size={10} /> {e.label}
                  </span>
                );
              })}
            </div>
          )}
          {eligibilities.length === 0 && !isInPaper && (
            <p className="text-[11px] text-muted">
              Pas encore éligible aux destinations. Continue à itérer dans le Laboratoire pour améliorer les KPIs.
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 relative">
          {!isInPaper && (
            <button
              onClick={() => alert("Modal 'Activer en Paper Trade' — à venir UX5/UX7")}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded bg-blue/15 border border-blue/40 text-blue hover:bg-blue/25 transition-colors whitespace-nowrap"
            >
              <FlaskConical size={13} /> Activer en Paper Trade <ArrowRight size={12} />
            </button>
          )}
          {isInPaper && eligibilities.length > 0 && (
            <button
              onClick={() => alert(`Modal 'Transférer vers...' — destinations éligibles : ${eligibilities.map(e => e.label).join(", ")}`)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded bg-blue/15 border border-blue/40 text-blue hover:bg-blue/25 transition-colors whitespace-nowrap"
            >
              Transférer vers… <ArrowRight size={12} />
            </button>
          )}

          {/* Lien secondaire discret : skip paper → activer direct (Option A validée) */}
          {!isInPaper && eligibilities.length > 0 && (
            <>
              <button
                onClick={() => setSkipMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-text underline decoration-dotted underline-offset-2 transition-colors"
              >
                ou activer directement sans paper <ChevronDown size={10} className={skipMenuOpen ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>
              {skipMenuOpen && (
                <div className="absolute top-full right-0 mt-1 w-64 rounded-lg border border-border bg-surface shadow-lg z-20 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border bg-ink/30 flex items-center gap-1.5">
                    <AlertTriangle size={11} className="text-amber-400" />
                    <span className="text-[10px] text-amber-400 uppercase tracking-wider font-medium">Skip paper — risque accru</span>
                  </div>
                  <div className="py-1">
                    {eligibilities.map((e) => {
                      const EIcon = e.Icon;
                      return (
                        <button
                          key={e.id}
                          onClick={() => {
                            setSkipMenuOpen(false);
                            const ok = confirm(
                              `⚠️ Activer directement sur ${e.label} sans passer par Paper Trade ?\n\n` +
                              `Risques :\n` +
                              `• Slippage réel non vérifié vs backtest\n` +
                              `• Latence d'exécution inconnue\n` +
                              `• Comportement live aux gaps non testé\n\n` +
                              `Modal complète + checkbox de confirmation à venir UX7.\n\n` +
                              `Continuer pareil ?`
                            );
                            if (ok) alert(`OK — activation directe sur ${e.label} (placeholder, modal complète UX7)`);
                          }}
                          className={`w-full px-3 py-2 text-xs text-left hover:bg-ink transition-colors flex items-center gap-2 ${e.color}`}
                        >
                          <EIcon size={12} /> {e.label}
                          <ArrowRight size={10} className="ml-auto opacity-50" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <p className="text-[10px] text-muted/70 text-right max-w-[200px]">
            {!isInPaper
              ? "Recommandé : Paper Trade d'abord pour valider la stratégie en live."
              : "Choisis la destination pour activer cette stratégie en capital réel."}
          </p>
        </div>
      </div>
    </div>
  );
}


// PaperTradeOverlay — affiche les KPIs paper vs backtest si la stratégie est actuellement en paper
// Données mockées en attendant Phase 2 D-033 (backend paper natif D-001 v2)
const PAPER_MOCK: Record<string, {
  status: "confirmed" | "in_progress" | "drift";
  paperDays: number;
  tradesPaper: number;
  pf_paper: number | null;
  pf_delta_pct: number | null;
  wr_paper: number | null;
  dd_paper: number | null;
  recentTrades: { date: string; side: string; pnl: number }[];
}> = {
  "2026-05-30T151816Z__f10_v1a_avwap_rr3_qqq_15m__s57": {
    status: "confirmed",
    paperDays: 12,
    tradesPaper: 9,
    pf_paper: 1.95,
    pf_delta_pct: -7,
    wr_paper: 44.4,
    dd_paper: -1.1,
    recentTrades: [
      { date: "2026-05-29 14:15", side: "LONG",  pnl: 46.50  },
      { date: "2026-05-28 10:45", side: "SHORT", pnl: -12.50 },
      { date: "2026-05-27 15:00", side: "LONG",  pnl: 41.00  },
      { date: "2026-05-26 11:30", side: "LONG",  pnl: -13.00 },
    ],
  },
  "2026-05-30T151817Z__v1a_voldelta_rr3_qqq_15m__s57": {
    status: "in_progress",
    paperDays: 6,
    tradesPaper: 3,
    pf_paper: null,
    pf_delta_pct: null,
    wr_paper: null,
    dd_paper: null,
    recentTrades: [],
  },
  "2026-05-28T120000Z__f1_v1e_qqq_range__s53": {
    status: "drift",
    paperDays: 28,
    tradesPaper: 8,
    pf_paper: 0.85,
    pf_delta_pct: -77,
    wr_paper: 25.0,
    dd_paper: -3.8,
    recentTrades: [
      { date: "2026-05-25 11:00", side: "LONG",  pnl: -22.00 },
      { date: "2026-05-22 14:30", side: "SHORT", pnl: -18.50 },
    ],
  },
};

function PaperTradeOverlay({ runId }: { runId: string }) {
  const paper = PAPER_MOCK[runId];
  if (!paper) return null;

  const verdictColor =
    paper.status === "confirmed" ? "border-green-500/40 bg-green-500/5" :
    paper.status === "drift"     ? "border-red-500/40 bg-red-500/5"   :
                                   "border-amber-500/40 bg-amber-500/5";

  const verdictLabel =
    paper.status === "confirmed" ? "✓ Paper confirme le backtest"  :
    paper.status === "drift"     ? "⚠ Drift détecté — ne pas transférer" :
                                   "⏱ Validation en cours — sample insuffisant";

  return (
    <div className={`rounded-lg border-l-4 p-4 ${verdictColor}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <FlaskConical size={14} className="text-blue" />
          En Paper Trade — {paper.paperDays} jours · {paper.tradesPaper} trades
        </h3>
        <span className="text-xs font-medium">{verdictLabel}</span>
      </div>

      {paper.pf_paper !== null && (
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-[10px] text-muted">PF Paper</div>
            <div className="font-mono font-medium">
              {paper.pf_paper.toFixed(2)}
              {paper.pf_delta_pct !== null && (
                <span className={`text-[10px] ml-1 ${paper.pf_delta_pct >= -20 ? "text-green-400" : paper.pf_delta_pct >= -30 ? "text-amber-400" : "text-red-300"}`}>
                  ({paper.pf_delta_pct > 0 ? "+" : ""}{paper.pf_delta_pct}%)
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted">WR Paper</div>
            <div className="font-mono font-medium">{paper.wr_paper?.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-[10px] text-muted">DD Paper</div>
            <div className="font-mono font-medium">{paper.dd_paper?.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {paper.recentTrades.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-2">Trades paper récents</div>
          <table className="w-full text-xs">
            <tbody>
              {paper.recentTrades.map((t, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0">
                  <td className="py-1 text-muted">{t.date}</td>
                  <td className="py-1">{t.side}</td>
                  <td className={`py-1 text-right font-mono ${t.pnl >= 0 ? "text-green-400" : "text-red-300"}`}>
                    {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paper.status === "in_progress" && (
        <div className="text-[11px] text-muted italic">
          Sample insuffisant (3/15 trades) · seuil Scalping requis : 15 trades minimum.
        </div>
      )}
    </div>
  );
}

// CompositionPanel — affiche les tags du run + lien vers le charter de famille
function CompositionPanel({ run }: { run: RunDetail }) {
  if (!run.tags || run.tags.length === 0) return null;

  // Extraire la famille depuis le nom (ex: "f10_v1a_avwap" → F10)
  const familyMatch = run.strategy.name.match(/^([fF]\d+)/);
  const family = familyMatch ? familyMatch[1].toUpperCase() : null;

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3">Composition de la stratégie</h3>
      <div className="text-[11px] text-muted mb-2">
        {run.tags.length} composant{run.tags.length > 1 ? "s" : ""} library / tags
      </div>
      <div className="flex flex-wrap gap-1.5">
        {run.tags.map((t) => (
          <span key={t} className="text-[11px] px-2 py-1 rounded-full bg-ink border border-border text-text">
            {t}
          </span>
        ))}
      </div>
      {family && (
        <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted">
          Famille <span className="text-text font-medium">{family}</span> ·
          <span className="ml-1 italic">charter : docs/scout/families/{family}/charter.md</span>
        </div>
      )}
    </div>
  );
}
