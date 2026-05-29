import { JOURNAL_ENTRIES, STRATEGY_SUMMARY, DEFI_SUMMARY } from "./journalData";

export default function JournalKPI() {
  const totalTrades = STRATEGY_SUMMARY.reduce((s, r) => s + r.trades, 0);
  const totalWins = STRATEGY_SUMMARY.reduce((s, r) => s + r.wins, 0);
  const totalLosses = STRATEGY_SUMMARY.reduce((s, r) => s + r.losses, 0);
  const globalWR = totalTrades > 0 ? (totalWins / totalTrades) * 100 : null;
  const globalBalance = DEFI_SUMMARY.paper.balance;
  const pnl = DEFI_SUMMARY.paper.pnl;
  const activeStrategies = STRATEGY_SUMMARY.length;
  const joursActifs = JOURNAL_ENTRIES.length;

  const cards = [
    {
      label: "Trades pris (cumul)",
      value: totalTrades.toString(),
      sub: `sur ${joursActifs} jours actifs`,
    },
    {
      label: "Balance globale",
      value: `${globalBalance.toLocaleString("fr-CA")} $`,
      sub: pnl === 0 ? "+0,00 $ vs initial" : `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} $ vs initial`,
    },
    {
      label: "Win rate global",
      value: globalWR === null ? "n/a" : `${globalWR.toFixed(1)} %`,
      sub: `${totalWins} W / ${totalLosses} L`,
    },
    {
      label: "Stratégies actives",
      value: activeStrategies.toString(),
      sub: STRATEGY_SUMMARY.map(s => s.strategie).join(" · "),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {cards.map(({ label, value, sub }) => (
        <div key={label} className="bg-surface border border-border rounded-lg px-5 py-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">{label}</div>
          <div className="text-2xl font-semibold text-text">{value}</div>
          <div className="text-[11px] text-muted mt-1">{sub}</div>
        </div>
      ))}
    </div>
  );
}
