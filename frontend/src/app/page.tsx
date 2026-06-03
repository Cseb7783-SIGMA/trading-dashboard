"use client";
import { FolderOpen, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useRuns } from "@/hooks/useRuns";
import KPISummary from "@/components/overview/KPISummary";
import Leaderboard from "@/components/overview/Leaderboard";
import StrategyLineageView from "@/components/overview/StrategyLineageView";
import MultiPeriodSummary from "@/components/overview/MultiPeriodSummary";
import AccordionSection from "@/components/ui/AccordionSection";

export default function OverviewPage() {
  const { runs, loading, streamStatus, toast } = useRuns();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4 p-3 rounded-lg bg-blue/5 border border-blue/20 text-xs">
        <div className="flex items-start gap-2">
          <span className="text-base">🧪</span>
          <div>
            <div className="font-semibold text-blue">Phase 1 — Laboratoire (Backtest historique)</div>
            <div className="text-muted mt-1">
              <span className="font-medium">Objectif</span> : découvrir des stratégies qui auraient été rentables sur les <span className="font-medium">données passées</span>. R&D, optimisation, walk-forward, classification. <span className="italic">Aucun capital engagé, aucune validation forward.</span>
            </div>
            <div className="text-muted mt-1.5">
              <span className="font-medium">Prochaine étape</span> → quand une stratégie semble robuste, on l'envoie en <strong>Paper Trade</strong> pour vérifier que le backtest tient en temps réel.
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text">Laboratoire</h1>
          <p className="text-xs text-muted mt-0.5">Évolution des stratégies — toutes catégories</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          {streamStatus === "connected"  && <Wifi size={13} className="text-green-400" aria-label="Stream connecté" />}
          {streamStatus === "connecting" && <Loader2 size={13} className="text-orange animate-spin" aria-label="Reconnexion en cours" />}
          {streamStatus === "disconnected" && <WifiOff size={13} className="text-red-400" aria-label="Stream hors ligne" />}
          <span>{streamStatus === "connected" ? "Stream actif" : streamStatus === "connecting" ? "Reconnexion…" : "Stream hors ligne"}</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-lg p-4 h-24 animate-pulse" />
            ))}
          </div>
          <div className="bg-surface border border-border rounded-lg h-64 animate-pulse" />
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <FolderOpen size={40} strokeWidth={1} className="text-border" aria-hidden="true" />
          <p className="text-muted text-sm">Aucun run détecté</p>
          <p className="text-muted text-xs">Lancez un backtest — le dashboard se mettra à jour automatiquement.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AccordionSection
            id="kpi-summary"
            title="KPIs principaux"
            subtitle="Runs analysés · Robustes · Best PF · Drift stable"
            defaultOpen={true}
          >
            <KPISummary runs={runs} />
          </AccordionSection>

          <AccordionSection
            id="multi-period"
            title="Résumé multi-périodes"
            subtitle="PF / WR par fenêtre temporelle (1m → all-time) · drift detection"
            defaultOpen={false}
          >
            <MultiPeriodSummary runs={runs} />
          </AccordionSection>

          <AccordionSection
            id="lineage"
            title="Stratégies par famille (S61)"
            subtitle="Vue hiérarchique : Stratégie → Version → Asset · TF — avec filtres Style/Tier/Stage/Catégorie"
            defaultOpen={true}
          >
            <StrategyLineageView runs={runs} />
          </AccordionSection>

          <AccordionSection
            id="leaderboard"
            title="Leaderboard classique (legacy)"
            subtitle="Vue plate par tier Davey (D-033) · filtres Scalping/Swing/Toutes"
            defaultOpen={false}
          >
            <Leaderboard runs={runs} />
          </AccordionSection>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-surface border border-blue/40 rounded-lg px-4 py-3 text-sm text-text shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 z-50">
          <span className="w-2 h-2 rounded-full bg-blue animate-pulse" />
          {toast}
        </div>
      )}
    </div>
  );
}
