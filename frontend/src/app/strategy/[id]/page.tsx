"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Code, ExternalLink } from "lucide-react";
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
          ← Retour overview
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text mb-4 px-2.5 py-1.5 rounded border border-border hover:border-blue/40 transition-colors"
        >
          ← Retour au leaderboard
        </button>
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
