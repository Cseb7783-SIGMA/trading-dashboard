"use client";
import Link from "next/link";
import { ChevronRight, Activity, TrendingUp, Building2, Trophy } from "lucide-react";
import LiveAgentCard from "@/components/agents/LiveAgentCard";
import { useAgentStream } from "@/hooks/useAgentStream";

function AggregateStats() {
  const paper = useAgentStream("paper-trader");
  const propfirm = useAgentStream("propfirm-trader");
  const challenge = useAgentStream("challenge-z-trader");

  const allStates = [paper.full, propfirm.full, challenge.full].filter(Boolean);
  const allStreams = [paper.stream, propfirm.stream, challenge.stream].filter(Boolean);
  const allConnected = [paper.connected, propfirm.connected, challenge.connected].filter(Boolean);

  const activeCount = allStates.filter(s => s?.status === "running").length;
  const totalEquity = allStates.reduce((acc, s) => {
    if (!s) return acc;
    const idx = allStates.indexOf(s);
    const streamEquity = allStreams[idx]?.equity;
    return acc + (streamEquity ?? s.portfolio.cash);
  }, 0);
  const totalInitial = allStates.reduce((acc, s) => acc + (s?.config.initial_capital ?? 0), 0);
  const totalPnl = totalEquity - totalInitial;
  const totalCost = allStates.reduce((acc, s) => acc + (s?.total_agent_cost_usd ?? 0), 0);

  return (
    <div className="flex gap-6 text-xs">
      <div className="text-right">
        <div className="text-muted uppercase tracking-wider">Agents actifs</div>
        <div className="font-medium text-base">{activeCount} / 3</div>
      </div>
      <div className="text-right">
        <div className="text-muted uppercase tracking-wider">Equity totale</div>
        <div className="font-medium text-base">${totalEquity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
      </div>
      <div className="text-right">
        <div className="text-muted uppercase tracking-wider">P&L agrégé</div>
        <div className={`font-medium text-base ${totalPnl >= 0 ? "text-green-400" : "text-red-300"}`}>
          {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-muted uppercase tracking-wider">Coût Claude</div>
        <div className="font-medium text-base">${totalCost.toFixed(3)}</div>
      </div>
    </div>
  );
}

export default function LiveAgentsPage() {
  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <nav className="text-[11px] text-muted">
        <Link href="/" className="text-blue hover:underline">Laboratoire</Link>
        <ChevronRight size={11} className="inline mx-1 opacity-40" />
        <span>Live Trading</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Activity size={22} className="text-blue" />
            <h1 className="text-xl font-semibold">Vue d'ensemble — 3 agents en parallèle</h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Comparaison live de Paper Trader, PropFirm FTMO et Challenge Z TMAFX (agents LLM autonomes — distincts des stratégies du Laboratoire)
          </p>
        </div>
        <AggregateStats />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <TrendingUp size={14} className="text-blue" />
            <span className="text-xs font-medium text-blue">Paper Trader</span>
          </div>
          <LiveAgentCard agentName="paper-trader" label="Risk libre · BTC + ETH" color="green" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Building2 size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-amber-400">PropFirm FTMO</span>
          </div>
          <LiveAgentCard agentName="propfirm-trader" label="Règles FTMO · BTC" color="amber" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Trophy size={14} className="text-purple-400" />
            <span className="text-xs font-medium text-purple-400">Challenge Z TMAFX</span>
          </div>
          <LiveAgentCard agentName="challenge-z-trader" label="Climb TMAFX · BTC" color="purple" />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-4">
        <h2 className="text-sm font-medium mb-3">Tous les trades — 3 agents confondus</h2>
        <div className="border-t border-b border-border py-3 mb-3 text-[11px] text-muted">
          Tableau agrégé des trades en cours et fermés des 3 agents · filtres par agent / actif / stratégie / résultat / période · tri par date d'entrée
        </div>
        <div className="text-xs text-muted italic text-center py-8">
          Tableau live à venir — connecté aux endpoints /trades de chaque agent.
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-3 text-[11px] text-muted leading-relaxed">
        ℹ️ <span className="text-text font-medium">Distinction importante</span> : ces 3 agents sont des <strong>LLM autonomes</strong> (Claude Haiku) qui décident eux-mêmes
        OPEN/CLOSE/SKIP sur crypto. Ils n'utilisent <strong>PAS</strong> tes stratégies du Laboratoire (F10, V1.E, etc.) — ils ont leurs propres règles génériques
        définies par Chedly (momentum, ema_cross, bb_rsi). Pour brancher tes stratégies Lab, voir Phase 3 (à venir).
      </div>
    </main>
  );
}
