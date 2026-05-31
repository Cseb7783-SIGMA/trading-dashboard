import { STRATEGY_SUMMARY } from "./journalData";

export default function StrategySummary() {
  if (STRATEGY_SUMMARY.length === 0) {
    return (
      <div className="bg-surface border border-border border-dashed rounded-lg p-5 text-center text-xs text-muted">
        Aucune stratégie active. Cette section affichera tes stratégies déployées sur Personal Broker / PropFirm / Challenge Z
        dès la <span className="text-text font-medium">Phase 3 (Paper Trade natif D-001 v2)</span>.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-muted text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-2">Stratégie</th>
            <th className="text-left px-4 py-2">Asset</th>
            <th className="text-left px-4 py-2">TF</th>
            <th className="text-left px-4 py-2">Destination</th>
            <th className="text-right px-4 py-2">Jours</th>
            <th className="text-right px-4 py-2">Signaux</th>
            <th className="text-right px-4 py-2">Trades</th>
            <th className="text-right px-4 py-2">W/L/BE</th>
            <th className="text-right px-4 py-2">WR</th>
            <th className="text-right px-4 py-2">PnL Net</th>
            <th className="text-right px-4 py-2">Balance</th>
          </tr>
        </thead>
        <tbody>
          {STRATEGY_SUMMARY.map((s, idx) => (
            <tr key={idx} className="border-b border-border/50">
              <td className="px-4 py-2 font-medium">{s.strategie}</td>
              <td className="px-4 py-2">{s.asset}</td>
              <td className="px-4 py-2">{s.timeframe}</td>
              <td className="px-4 py-2"><span className="text-[10px] px-2 py-0.5 rounded bg-ink">{s.defi}</span></td>
              <td className="px-4 py-2 text-right font-mono">{s.jours}</td>
              <td className="px-4 py-2 text-right font-mono">{s.signaux}</td>
              <td className="px-4 py-2 text-right font-mono">{s.trades}</td>
              <td className="px-4 py-2 text-right font-mono">{s.wins}/{s.losses}/{s.be}</td>
              <td className="px-4 py-2 text-right font-mono">{s.winRate !== null ? `${s.winRate.toFixed(1)}%` : "n/a"}</td>
              <td className={`px-4 py-2 text-right font-mono ${s.pnl > 0 ? "text-green-400" : s.pnl < 0 ? "text-red-300" : ""}`}>{s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(2)}</td>
              <td className="px-4 py-2 text-right font-mono">${s.balance.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
