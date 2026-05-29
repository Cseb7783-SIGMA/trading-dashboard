import { STRATEGY_SUMMARY } from "./journalData";

export default function StrategySummary() {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden mb-6">
      <table className="w-full text-sm">
        <thead className="bg-ink">
          <tr className="text-[10px] text-muted uppercase tracking-wider">
            <th className="px-4 py-3 text-left font-medium">Stratégie</th>
            <th className="px-3 py-3 text-left font-medium">Asset</th>
            <th className="px-3 py-3 text-left font-medium">TF</th>
            <th className="px-3 py-3 text-left font-medium">Défi</th>
            <th className="px-3 py-3 text-right font-medium">Jours</th>
            <th className="px-3 py-3 text-right font-medium">Signaux</th>
            <th className="px-3 py-3 text-right font-medium">Trades</th>
            <th className="px-3 py-3 text-left font-medium">W / L / BE</th>
            <th className="px-3 py-3 text-right font-medium">WR</th>
            <th className="px-3 py-3 text-right font-medium">PnL net</th>
            <th className="px-4 py-3 text-right font-medium">Balance</th>
          </tr>
        </thead>
        <tbody>
          {STRATEGY_SUMMARY.map((r) => (
            <tr key={r.strategie} className="border-t border-border text-xs">
              <td className="px-4 py-2.5 text-green font-medium">{r.strategie}</td>
              <td className="px-3 py-2.5 text-text2">{r.asset}</td>
              <td className="px-3 py-2.5 text-text2">{r.timeframe}</td>
              <td className="px-3 py-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] bg-border/60 text-muted">{r.defi}</span>
              </td>
              <td className="px-3 py-2.5 text-right text-text2">{r.joursActifs}</td>
              <td className="px-3 py-2.5 text-right text-text2">{r.signaux}</td>
              <td className="px-3 py-2.5 text-right text-text2">{r.trades}</td>
              <td className="px-3 py-2.5 text-text2">{r.wins} / {r.losses} / {r.be}</td>
              <td className="px-3 py-2.5 text-right text-text2">
                {r.winRate === null ? "n/a" : `${r.winRate.toFixed(1)} %`}
              </td>
              <td className="px-3 py-2.5 text-right text-text2">
                {r.pnlNet === 0 ? "0,00 $" : `${r.pnlNet >= 0 ? "+" : ""}${r.pnlNet.toFixed(2)} $`}
              </td>
              <td className="px-4 py-2.5 text-right text-text font-medium">
                {r.balance.toLocaleString("fr-CA")} $
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
