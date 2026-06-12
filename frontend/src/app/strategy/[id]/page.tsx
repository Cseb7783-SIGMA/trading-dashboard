"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Code, ExternalLink, ArrowRight, Hammer, FlaskConical, Briefcase, Building2, Trophy, ChevronDown, AlertTriangle } from "lucide-react";
import { fetchRun } from "@/lib/api";
import type { RunDetail } from "@/lib/types";
import KPICards from "@/components/strategy/KPICards";
import TvValidationPanel from "@/components/strategy/TvValidationPanel";
import EquityCurve from "@/components/strategy/EquityCurve";
import DrawdownChart from "@/components/strategy/DrawdownChart";
import TradeScatter from "@/components/strategy/TradeScatter";
import RollingMetrics from "@/components/strategy/RollingMetrics";
import TradeTable from "@/components/strategy/TradeTable";
import PaperTradeTable from "@/components/strategy/PaperTradeTable";
import PriceChart from "@/components/strategy/PriceChart";
import PineModal from "@/components/strategy/PineModal";
import ActivateModal from "@/components/strategy/ActivateModal";
import PaperLiveCard from "@/components/strategy/PaperLiveCard";
import LiveChart from "@/components/strategy/LiveChart";
import type { Destination } from "@/lib/api";

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
        {(() => {
          const stage = run.d033?.deployment_stage ?? "rd";
          const ctx: Record<string, { label: string; href: string; icon: string; phase: string }> = {
            rd:                  { label: "Laboratoire",     href: "/",              icon: "🧪", phase: "Phase 1 — Backtest historique" },
            backtest_validated:  { label: "Laboratoire",     href: "/",              icon: "🧪", phase: "Phase 1 — Backtest validé" },
            paper:               { label: "Paper Trade",     href: "/paper",         icon: "📊", phase: "Phase 2 — Validation forward live" },
            broker:              { label: "Personal Broker", href: "/personal-broker", icon: "💰", phase: "Phase 3 — Capital réel personnel" },
            propfirm:            { label: "PropFirm",        href: "/propfirm",      icon: "🏛", phase: "Phase 3 — Challenge PropFirm" },
            challenge_z:         { label: "Challenge Z",     href: "/challenge-z",   icon: "🏆", phase: "Phase 3 — TMAFX Climb Z" },
          };
          const c = ctx[stage] ?? ctx.rd;
          return (
            <>
              <nav className="text-[11px] text-muted mb-2 flex items-center">
                <button onClick={() => router.push(c.href)} className="text-blue hover:underline">{c.icon} {c.label}</button>
                <span className="mx-1 opacity-40">›</span>
                <span>{run.strategy.name}</span>
              </nav>
              <div className="text-[11px] text-muted/70 mb-4 italic">
                {c.phase}
              </div>
            </>
          );
        })()}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-text truncate">
              {run.strategy.name} <span className="text-muted font-normal text-base">{run.strategy.version}</span>
            </h1>
            <p className="text-xs text-muted mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{run.universe.instrument} · {run.universe.timeframe} · {new Date(run.created_at).toLocaleDateString("fr-CA")}</span>
              {(() => {
                // Calcul du holding time moyen depuis run.trades
                const trades = run.trades ?? [];
                if (trades.length === 0) return null;

                // Parse timeframe en minutes
                const tf = (run.universe.timeframe ?? "").toLowerCase();
                const m = tf.match(/^(\d+)(m|min|h|hour|d|day|w|week)?/);
                const tfMin = m
                  ? (m[2]?.startsWith("h") ? parseInt(m[1])*60
                    : m[2]?.startsWith("d") ? parseInt(m[1])*60*24
                    : m[2]?.startsWith("w") ? parseInt(m[1])*60*24*7
                    : parseInt(m[1]))
                  : 60;

                // Holding time moyen en minutes = avg(bars_held) × tfMin
                const avgBars = trades.reduce((s, t) => s + (t.bars_held || 0), 0) / trades.length;
                const avgHoldingMin = avgBars * tfMin;
                const avgHoldingHours = avgHoldingMin / 60;
                const avgHoldingDays = avgHoldingHours / 24;

                // Trades par jour (sur la période du backtest)
                const firstDt = new Date(trades[0].entry_dt).getTime();
                const lastDt  = new Date(trades[trades.length - 1].exit_dt).getTime();
                const periodDays = Math.max(1, (lastDt - firstDt) / 86400000);
                const tradesPerDay = trades.length / periodDays;

                // Classification (S59 — seuil flexible Sebast)
                // Scalping = au moins 1 trade tous les 2 jours (≥ 0.5 trades/jour)
                // Position = très peu fréquent (< 1 trade par 20 jours)
                // Swing = entre les deux
                let style: "scalping" | "swing" | "position";
                let icon: string;
                let cls: string;
                if (tradesPerDay >= 0.5) {
                  style = "scalping"; icon = "⚡"; cls = "bg-blue-50 text-blue-700 border-blue-300";
                } else if (tradesPerDay < 0.05 && avgHoldingDays > 7) {
                  style = "position"; icon = "🌳"; cls = "bg-green-50 text-green-700 border-green-300";
                } else {
                  style = "swing"; icon = "🕰"; cls = "bg-purple-50 text-purple-700 border-purple-300";
                }

                const label = style === "scalping" ? "Scalping" : style === "position" ? "Position" : "Swing";
                const detail = avgHoldingHours < 1
                  ? `${Math.round(avgHoldingMin)}min holding`
                  : avgHoldingDays < 1
                  ? `${avgHoldingHours.toFixed(1)}h holding`
                  : `${avgHoldingDays.toFixed(1)}j holding`;

                return (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${cls}`}
                    title={`${detail} · ${tradesPerDay.toFixed(2)} trades/jour · ${trades.length} trades sur ${Math.round(periodDays)} jours`}
                  >
                    {icon} {label}
                  </span>
                );
              })()}
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
        {run.notes && (() => {
          // Fix 1 (S59 UX) : parser les triggers dict Python brut → badges colorés
          const m = run.notes.match(/Triggers:\s*(\{[^}]+\})/);
          if (m) {
            const before = run.notes.slice(0, m.index).trim();
            // Parse format "{'key': N, 'key2': N2, ...}"
            const triggerPairs: Array<{ name: string; count: number; isLong: boolean }> = [];
            const re = /[\'"]([^\'"]+)[\'"]:\s*(\d+)/g;
            let mm;
            while ((mm = re.exec(m[1])) !== null) {
              const name = mm[1];
              const count = parseInt(mm[2], 10);
              const isLong = name.toUpperCase().includes("LONG");
              triggerPairs.push({ name, count, isLong });
            }
            triggerPairs.sort((a, b) => b.count - a.count);
            return (
              <div className="mt-2 space-y-1.5">
                {before && <p className="text-xs text-muted italic">{before}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {triggerPairs.slice(0, 8).map((t) => (
                    <span
                      key={t.name}
                      className={`text-[10px] px-2 py-0.5 rounded font-mono ${t.isLong ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
                      title={`${t.count} trades sur ce trigger`}
                    >
                      {t.name} · {t.count}
                    </span>
                  ))}
                  {triggerPairs.length > 8 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-surface text-muted border border-border">
                      +{triggerPairs.length - 8} autres
                    </span>
                  )}
                </div>
              </div>
            );
          }
          return <p className="text-xs text-muted mt-2 italic">{run.notes}</p>;
        })()}
      </div>

      {/* Panneau d'actions — où en est cette stratégie, où peut-elle aller */}
      <ActionPanel run={run} />

      <div className="space-y-4">
        <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text">📚 Backtest Historique</h3>
              <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300">
                {run.kpis.total_trades} trades · données passées
              </span>
            </div>
          </div>
          <KPICards kpis={run.kpis} />
        </div>

        <div className="mt-4">
          <TvValidationPanel runId={decodeURIComponent(id)} />
        </div>

        {/* Paper Trader Live (S59 Phase B) — visible uniquement si deployment_stage = paper */}
        {run.d033?.deployment_stage === "paper" && (
          <>
            <PaperLiveCard runId={decodeURIComponent(id)} instrument={run.universe?.instrument} />
            <PaperTradeTable runId={decodeURIComponent(id)} />
            {run.universe?.instrument && run.universe?.timeframe && (
              <LiveChart symbol={run.universe.instrument} tf={run.universe.timeframe} runId={decodeURIComponent(id)} strategyName={run.strategy.name} />
            )}
          </>
        )}

        {/* Résumé multi-périodes pour cette stratégie (S59) */}
        {run.kpis_by_period && Object.keys(run.kpis_by_period).length > 0 && (
          <div className="bg-surface border border-border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-text">Résumé multi-périodes</h3>
                <p className="text-[11px] text-muted mt-0.5">PF / WR par fenêtre temporelle — détection drift</p>
              </div>
              {run.drift_status && run.drift_status !== "n/a" && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                  run.drift_status === "stable" ? "bg-green-50 text-green-700 border-green-200" :
                  run.drift_status === "warning" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  run.drift_status === "critical" ? "bg-red-50 text-red-700 border-red-200" :
                  "bg-surface text-muted border-border"
                }`}>
                  Drift : {run.drift_status}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {(["12m", "6m", "3m", "1m"] as const).map((period) => {
                const kp = run.kpis_by_period?.[period];
                const label = period;
                if (!kp || kp.pf === null || kp.pf === undefined) {
                  return (
                    <div key={period} className="bg-ink/30 rounded p-2.5 border border-border/60 text-center">
                      <div className="text-[10px] text-muted uppercase tracking-wider mb-1">{label}</div>
                      <div className="text-base text-muted">—</div>
                      <div className="text-[10px] text-muted/60 mt-0.5">{kp?.trades ?? 0} trades</div>
                    </div>
                  );
                }
                // Sample insuffisant : < 5 trades → afficher en gris, pas de PF coloré (artefact)
                const sampleInsuffisant = kp.trades < 5;
                if (sampleInsuffisant) {
                  return (
                    <div key={period} className="bg-ink/30 rounded p-2.5 border border-border/60 text-center" title={`PF ${kp.pf.toFixed(2)} non significatif (seulement ${kp.trades} trades)`}>
                      <div className="text-[10px] text-muted uppercase tracking-wider mb-1">{label}</div>
                      <div className="text-base font-semibold font-mono text-muted/60">
                        {Number.isFinite(kp.pf) ? kp.pf.toFixed(2) : "∞"}
                      </div>
                      <div className="text-[10px] text-amber-600 mt-0.5">⚠ {kp.trades} trades</div>
                    </div>
                  );
                }
                const pfColor =
                  kp.pf >= 1.5 ? "text-green-700" :
                  kp.pf >= 1.2 ? "text-blue" :
                  kp.pf >= 1.0 ? "text-amber-600" : "text-red-500";
                return (
                  <div key={period} className="bg-ink/30 rounded p-2.5 border border-border/60 text-center">
                    <div className="text-[10px] text-muted uppercase tracking-wider mb-1">{label}</div>
                    <div className={`text-base font-semibold font-mono ${pfColor}`}>
                      {Number.isFinite(kp.pf) ? kp.pf.toFixed(2) : "∞"}
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">
                      {kp.wr !== null && kp.wr !== undefined ? `${kp.wr.toFixed(0)}%` : "—"}
                      <span className="text-muted/60"> · {kp.trades} trades</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <PriceChart runId={decodeURIComponent(id)} defaultAsset={run.universe.instrument} defaultTf={run.universe.timeframe} />

        <details className="bg-surface border border-border rounded-lg group">
          <summary className="px-4 py-3 cursor-pointer select-none flex items-center justify-between hover:bg-surface-hover transition-colors text-xs text-muted uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
              Voir les {run.trades.length} trades historiques (Backtest)
            </span>
            <span className="text-[10px] normal-case text-muted/70">
              Référence historique — déjà résumé dans les KPIs ci-dessus
            </span>
          </summary>
          <div className="border-t border-border">
            <TradeTable trades={run.trades} title="Trades Backtest" />
          </div>
        </details>

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
  const [activateTarget, setActivateTarget] = useState<Destination | null>(null);
  const router = useRouter();

  // D-033 : stade et éligibilités viennent du backend (meta.json d033 namespace)
  const stage = run.d033?.deployment_stage ?? "rd";
  const elig = run.d033?.eligibility ?? { paper: "no", personal_broker: "no", challenge_z: "no", propfirm: "no" };

  // Détermine le stade actuel
  type Stage = { id: string; label: string; Icon: typeof Hammer; color: string; bg: string };
  const STAGE_INFO: Record<string, Stage> = {
    rd:          { id: "rd",          label: "R&D",                  Icon: Hammer,        color: "text-muted",      bg: "bg-surface border-border" },
    paper:       { id: "paper",       label: "Paper Trade",          Icon: FlaskConical,  color: "text-purple-700",  bg: "bg-purple-50 border-purple-300" },
    broker:      { id: "broker",      label: "Personal Broker actif",Icon: Briefcase,     color: "text-blue-700",    bg: "bg-blue-50 border-blue-300" },
    propfirm:    { id: "propfirm",    label: "PropFirm FTMO actif",  Icon: Building2,     color: "text-amber-700",   bg: "bg-amber-50 border-amber-300" },
    challenge_z: { id: "challenge_z", label: "Challenge Z actif",    Icon: Trophy,        color: "text-yellow-700",  bg: "bg-yellow-50 border-yellow-300" },
  };
  const currentStage = STAGE_INFO[stage] ?? STAGE_INFO["rd"];

  // Éligibilités basées sur d033.eligibility (source unique de vérité D-033)
  type Eligibility = { id: string; label: string; Icon: typeof Briefcase; color: string };
  const eligibilities: Eligibility[] = [];
  if (elig.personal_broker === "yes") eligibilities.push({ id: "broker",      label: "Personal Broker",   Icon: Briefcase, color: "text-blue-700" });
  if (elig.propfirm === "yes")        eligibilities.push({ id: "propfirm",    label: "PropFirm FTMO",     Icon: Building2, color: "text-amber-700" });
  if (elig.challenge_z === "yes")     eligibilities.push({ id: "challenge_z", label: "Challenge Z TMAFX", Icon: Trophy,    color: "text-yellow-700" });

  const isInPaper = stage === "paper";
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
              onClick={() => setActivateTarget("paper")}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded bg-blue/15 border border-blue/40 text-blue hover:bg-blue/25 transition-colors whitespace-nowrap"
            >
              <FlaskConical size={13} /> Activer en Paper Trade <ArrowRight size={12} />
            </button>
          )}
          {isInPaper && eligibilities.length > 0 && (
            <button
              onClick={() => {
                // MVP : transférer vers la 1ère destination éligible (modal Transférer plus avancé en backlog)
                const firstEligible = eligibilities[0]?.id as Destination | undefined;
                if (firstEligible) setActivateTarget(firstEligible);
              }}
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
                            if (ok) setActivateTarget(e.id as Destination);
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
              : eligibilities.length > 0
                ? "Stratégie validée pour ces destinations. Transférer = capital réel engagé."
                : "Continuer le paper trade pour accumuler sample requis."}
          </p>
        </div>
      </div>

      {activateTarget && (
        <ActivateModal
          runId={run.run_id}
          strategyName={run.strategy.name}
          destination={activateTarget}
          currentStage={run.d033?.deployment_stage ?? "rd"}
          onClose={() => setActivateTarget(null)}
          onSuccess={() => {
            setActivateTarget(null);
            router.refresh();
          }}
        />
      )}
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
  // ⚠ Volontairement vide — les vraies données paper viendront des agents LLM
  // quand ils publieront leurs trades. Tant que vide, PaperTradeOverlay ne s'affichera pas.
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
