"use client";
import Link from "next/link";
import { Layers, ChevronRight, Lightbulb } from "lucide-react";

export default function MultiStrategiesPage() {
  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <nav className="text-[11px] text-muted">
        <Link href="/" className="text-blue hover:underline">Laboratoire</Link>
        <ChevronRight size={11} className="inline mx-1 opacity-40" />
        <span>Multi-Stratégies</span>
      </nav>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <Layers size={22} className="text-blue" />
          <h1 className="text-xl font-semibold">Multi-Stratégies</h1>
          <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 uppercase">
            À venir
          </span>
        </div>
        <p className="text-xs text-muted mt-0.5">Orchestrateur asset-centric — plusieurs stratégies actives sur un même asset selon le régime de marché</p>
      </div>

      <div className="bg-surface border border-border border-dashed rounded-lg p-6 text-center">
        <Layers size={36} strokeWidth={1} className="mx-auto mb-3 opacity-30 text-blue" />
        <h2 className="text-base font-medium mb-2">Module en développement</h2>
        <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
          Cette section permettra de choisir un <strong className="text-text">asset</strong> (ex: AAPL) et d&apos;activer plusieurs
          <strong className="text-text"> stratégies profitables</strong> qui s&apos;activent automatiquement selon les
          conditions de marché (trend / range / volatilité).
        </p>
      </div>

      <div className="bg-surface border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Vision du module</h3>
        <div className="space-y-2 text-xs text-muted leading-relaxed">
          <p>
            <strong className="text-text">Approche actuelle</strong> : 1 stratégie = 1 setup (ex: F10 V1A×AVWAP sur QQQ 15m uniquement).
          </p>
          <p>
            <strong className="text-text">Approche Multi-Stratégies</strong> : tu choisis un asset, et le système assigne plusieurs
            stratégies qui s&apos;activent selon le régime de marché détecté en live (R2 Regime Classifier).
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-[11px] text-muted mb-2">Exemple sur AAPL Swing :</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2"><span className="text-green-400">↑</span> Régime TREND ↑ → F10 V1A×AVWAP (long-bias)</div>
            <div className="flex items-center gap-2"><span className="text-amber-400">↔</span> Régime RANGE → F1 V1.E range breakout</div>
            <div className="flex items-center gap-2"><span className="text-purple-400">⚡</span> Régime VOLATILITÉ → BB + RSI mean revert</div>
            <div className="flex items-center gap-2"><span className="text-red-300">↓</span> Régime TREND ↓ → Short setup</div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Lightbulb size={14} className="text-amber-400" /> Pré-requis
        </h3>
        <ol className="text-xs text-muted space-y-1.5 list-decimal list-inside leading-relaxed">
          <li><strong className="text-text">Phase 3 done</strong> — paper trade natif fonctionnel (D-001 v2)</li>
          <li><strong className="text-text">5+ stratégies Swing validées</strong> Tier ≥ HIGH (familles F11, F12, F13, etc.)</li>
          <li><strong className="text-text">R2 Regime Classifier branché en live</strong> (data réelle, pas backtest)</li>
          <li><strong className="text-text">Orchestrateur</strong> — code qui détecte régime + route vers stratégie active</li>
        </ol>
      </div>

      <div className="bg-surface border border-border rounded-lg p-3 text-[11px] text-muted leading-relaxed">
        💡 <strong className="text-text font-medium">Conceptualisation S59</strong> : module documenté dans backlog (task #250 — AMS Asset-Centric Multi-Strategy).
        Implémentation prévue après Phase 3 + accumulation de plusieurs stratégies Swing.
      </div>
    </main>
  );
}
