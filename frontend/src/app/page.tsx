"use client";
import { FolderOpen, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useRuns } from "@/hooks/useRuns";
import KPISummary from "@/components/overview/KPISummary";
import Leaderboard from "@/components/overview/Leaderboard";

export default function OverviewPage() {
  const { runs, loading, streamStatus, toast } = useRuns();

  return (
    <div className="p-6 max-w-7xl mx-auto">
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
        <div className="space-y-4">
          <KPISummary runs={runs} />
          <Leaderboard runs={runs} />
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
