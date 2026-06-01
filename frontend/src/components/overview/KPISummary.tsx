"use client";
import { useState } from "react";
import type { Run } from "@/lib/types";
import Tooltip from "@/components/ui/Tooltip";

const DEFINITIONS = {
  runs: "Nombre total de backtests ingérés dans le dashboard depuis S26 (mai 2026). Chaque run = 1 exécution complète d'une stratégie sur des données historiques.",
  robust: "Tier STATISTICALLY_ROBUST (D-033) — Pipeline Davey 1-5 PASS complet : Train + Walk-Forward + OOS strict + Monte Carlo + Multi-asset. Le seul tier qualifié pour Personal Broker live.",
  pf: "Profit Factor le plus élevé parmi les stratégies tier ≥ MEDIUM. PF = Gross Profit / Gross Loss. Au-dessus de 1.5 = rentable robuste. Au-dessus de 2.0 = très solide.",
  drift: "Stratégies dont la performance récente (3 mois) reste cohérente avec l'historique all-time. Ratio PF 3m / PF all-time ≥ 0.85. Pas de signal de dégradation détecté.",
};

export default function KPISummary({ runs }: { runs: Run[] }) {
  const [modalType, setModalType] = useState<"robust" | "stable" | null>(null);

  if (!runs.length) return null;

  const tierCounts = runs.reduce((acc, r) => {
    const t = r.d033?.tier_davey ?? "Archive";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const robustCount = tierCounts["STATISTICALLY_ROBUST"] ?? 0;
  const highCount = tierCounts["HIGH"] ?? 0;
  const mediumCount = tierCounts["MEDIUM"] ?? 0;

  const eligibleRuns = runs.filter((r) =>
    ["STATISTICALLY_ROBUST", "HIGH", "MEDIUM"].includes(r.d033?.tier_davey ?? "")
  );
  const bestPF = eligibleRuns.length > 0
    ? Math.max(...eligibleRuns.map((r) => r.kpis.profit_factor))
    : 0;

  const robustRuns = runs.filter((r) => r.d033?.tier_davey === "STATISTICALLY_ROBUST");
  const stableRuns = runs.filter((r) => r.drift_status === "stable");

  const modalRuns = modalType === "robust" ? robustRuns : modalType === "stable" ? stableRuns : [];
  const modalTitle = modalType === "robust"
    ? `🏆 Stratégies Statistically Robust (${robustRuns.length})`
    : `🟢 Stratégies sans dérive (${stableRuns.length})`;
  const modalDesc = modalType === "robust"
    ? "Pipeline Davey 1-5 PASS complet. Prêtes pour Paper Trade / Personal Broker (tier le plus haut)."
    : "Performance récente (3 mois) cohérente avec l'historique (ratio PF ≥ 0.85). Pas de signal de dégradation.";

  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-lg px-5 py-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
            Runs analysés
            <Tooltip label="" text={DEFINITIONS.runs} />
          </div>
          <div className="text-2xl font-semibold text-text">{runs.length}</div>
          <div className="text-[11px] text-muted mt-1">depuis S26 · {robustCount + highCount + mediumCount} tier ≥ MEDIUM</div>
        </div>

        <button
          onClick={() => setModalType("robust")}
          className="bg-surface border border-border rounded-lg px-5 py-4 text-left hover:border-amber-400 transition-colors cursor-pointer"
        >
          <div className="text-xs text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
            Stratégies Robustes
            <Tooltip label="" text={DEFINITIONS.robust} />
          </div>
          <div className="text-2xl font-semibold text-amber-300">{robustCount}</div>
          <div className="text-[11px] text-muted mt-1">{robustCount > 0 ? "Click pour voir lesquelles →" : "aucune à ce stade"}</div>
        </button>

        <div className="bg-surface border border-border rounded-lg px-5 py-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
            Best PF (tier ≥ MEDIUM)
            <Tooltip label="" text={DEFINITIONS.pf} />
          </div>
          <div className="text-2xl font-semibold text-text">{bestPF > 0 ? bestPF.toFixed(2) : "—"}</div>
          <div className="text-[11px] text-muted mt-1">{eligibleRuns.length > 0 ? `parmi ${eligibleRuns.length} stratégies qualifiées` : "aucune qualifiée"}</div>
        </div>

        <button
          onClick={() => setModalType("stable")}
          className="bg-surface border border-border rounded-lg px-5 py-4 text-left hover:border-green-400 transition-colors cursor-pointer"
        >
          <div className="text-xs text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
            Drift stable
            <Tooltip label="" text={DEFINITIONS.drift} />
          </div>
          <div className="text-2xl font-semibold text-green-400">{stableRuns.length}</div>
          <div className="text-[11px] text-muted mt-1">{stableRuns.length > 0 ? "Click pour voir lesquelles →" : "aucune stable détectée"}</div>
        </button>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModalType(null)}>
          <div className="bg-surface border border-border rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">{modalTitle}</h3>
              <button onClick={() => setModalType(null)} className="text-muted hover:text-text text-xl leading-none">✕</button>
            </div>
            <p className="text-xs text-muted mb-4">{modalDesc}</p>
            {modalRuns.length === 0 ? (
              <div className="text-center text-sm text-muted py-8">Aucune stratégie à ce stade.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted text-xs uppercase tracking-wider">
                    <th className="text-left py-2">Stratégie</th>
                    <th className="text-left py-2">Univers</th>
                    <th className="text-right py-2">Tier</th>
                    <th className="text-right py-2">PF all-time</th>
                    <th className="text-right py-2">PF 3m</th>
                    <th className="text-right py-2">Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {modalRuns.map((r) => (
                    <tr key={r.run_id} className="border-b border-border/50 hover:bg-ink">
                      <td className="py-2 font-medium">{r.strategy.name}</td>
                      <td className="py-2 text-xs">{r.universe.instrument} {r.universe.timeframe}</td>
                      <td className="py-2 text-right text-xs">{r.d033?.tier_davey ?? "—"}</td>
                      <td className="py-2 text-right font-mono">{r.kpis_by_period?.all_time?.pf?.toFixed(2) ?? r.kpis.profit_factor.toFixed(2)}</td>
                      <td className="py-2 text-right font-mono">{r.kpis_by_period?.["3m"]?.pf?.toFixed(2) ?? "—"}</td>
                      <td className="py-2 text-right font-mono">{r.kpis.total_trades}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  );
}
