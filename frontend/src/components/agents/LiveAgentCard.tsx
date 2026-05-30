"use client";
import { useAgentStream } from "@/hooks/useAgentStream";
import { Activity, AlertCircle, Square, RotateCcw } from "lucide-react";

type Props = {
  agentName: "paper-trader" | "propfirm-trader" | "challenge-z-trader";
  label: string;
  color: "green" | "purple" | "amber";
};

const PLATFORM_BASE = process.env.NEXT_PUBLIC_PLATFORM_BASE || "http://localhost:8002";

const COLOR_MAP = {
  green:  { dot: "bg-green-400", text: "text-green-300", border: "border-green-500/40", bg: "bg-green-500/5" },
  purple: { dot: "bg-purple-400", text: "text-purple-300", border: "border-purple-500/40", bg: "bg-purple-500/5" },
  amber:  { dot: "bg-amber-400", text: "text-amber-300", border: "border-amber-500/40", bg: "bg-amber-500/5" },
};

export default function LiveAgentCard({ agentName, label, color }: Props) {
  const { full, stream, connected, error } = useAgentStream(agentName);
  const c = COLOR_MAP[color];

  // Fallback si aucune donnée
  if (!full && !stream) {
    return (
      <div className="bg-surface border border-border border-dashed rounded-lg p-5 text-center text-xs text-muted">
        {error ? (
          <span className="text-red-300">
            <AlertCircle size={12} className="inline mr-1" />
            Backend platform indisponible (port 8002). Démarre <code>uvicorn main:app --reload --port 8002</code>.
          </span>
        ) : (
          <span>Connexion à l'agent <strong>{label}</strong>…</span>
        )}
      </div>
    );
  }

  const equity = stream?.equity ?? full?.portfolio.cash ?? 0;
  const initialCapital = full?.config.initial_capital ?? 0;
  const pnl = equity - initialCapital;
  const pnlPct = initialCapital > 0 ? (pnl / initialCapital) * 100 : 0;
  const cycle = stream?.cycle ?? full?.cycle_count ?? 0;
  const positions = stream?.positions ?? 0;
  const trades = full?.portfolio.closed_trades?.length ?? 0;
  const cost = full?.total_agent_cost_usd ?? 0;
  const running = full?.status === "running";

  const handleStop = async () => {
    if (!confirm(`Arrêter l'agent ${label} ?`)) return;
    await fetch(`${PLATFORM_BASE}/${agentName}/stop`, { method: "POST" });
    window.location.reload();
  };

  const handleReset = async () => {
    if (!confirm(`Reset l'agent ${label} (efface tout l'historique) ?`)) return;
    await fetch(`${PLATFORM_BASE}/${agentName}/reset`, { method: "POST" });
    window.location.reload();
  };

  return (
    <div className={`border ${c.border} ${c.bg} rounded-lg p-4`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`w-2 h-2 rounded-full ${c.dot} ${running ? "animate-pulse" : "opacity-40"}`} />
            <span className={`text-sm font-medium ${c.text}`}>{label}</span>
            {running && <span className="text-[9px] uppercase tracking-wider text-muted">● LIVE</span>}
            {!running && <span className="text-[9px] uppercase tracking-wider text-muted">stopped</span>}
            {connected && <Activity size={11} className="text-green-400" />}
          </div>
          <div className="text-[10px] text-muted">
            {full?.config.assets.join(" · ")} · interval {full?.config.interval_seconds}s
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleStop}
            disabled={!running}
            className="text-[10px] px-2 py-1 rounded border border-border hover:border-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            title="Arrêter l'agent"
          >
            <Square size={9} /> Stop
          </button>
          <button
            onClick={handleReset}
            className="text-[10px] px-2 py-1 rounded border border-border hover:border-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
            title="Reset (efface l'historique)"
          >
            <RotateCcw size={9} /> Reset
          </button>
        </div>
      </div>

      {/* KPIs grid */}
      <div className="grid grid-cols-4 gap-3 text-xs">
        <div>
          <div className="text-[10px] text-muted">Equity</div>
          <div className="font-medium font-mono">${equity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted">P&L</div>
          <div className={`font-medium font-mono ${pnl >= 0 ? "text-green-400" : "text-red-300"}`}>
            {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
            <span className="text-[9px] ml-1 opacity-80">({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted">Cycles</div>
          <div className="font-medium font-mono">{cycle.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted">Trades</div>
          <div className="font-medium font-mono">{trades} <span className="text-[9px] text-muted">({positions} ouverts)</span></div>
        </div>
      </div>

      {/* Footer */}
      <div className={`mt-3 pt-2 border-t ${c.border} text-[10px] text-muted flex items-center justify-between`}>
        <span>Coût Claude : <span className="text-text font-mono">${cost.toFixed(4)}</span></span>
        <span className="flex items-center gap-1">
          {connected ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Stream live</>
          ) : (
            <><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Stream offline</>
          )}
        </span>
      </div>
    </div>
  );
}
