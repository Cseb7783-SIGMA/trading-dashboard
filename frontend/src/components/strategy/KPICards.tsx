import type { KPIs } from "@/lib/types";
import { colorClass, ddColor, pfColor, tradesColor, wrColor } from "@/lib/colors";

interface Card {
  label: string;
  value: string;
  color: string;
  sub?: string;
}

export default function KPICards({ kpis }: { kpis: KPIs }) {
  const cards: Card[] = [
    { label: "Profit Factor", value: kpis.profit_factor.toFixed(2), color: colorClass(pfColor(kpis.profit_factor)) },
    { label: "Max Drawdown", value: `${kpis.max_drawdown_pct.toFixed(2)}%`, color: colorClass(ddColor(kpis.max_drawdown_pct)) },
    { label: "Max Consec Wins", value: kpis.max_consec_wins.toString(), color: colorClass(kpis.max_consec_wins >= 5 ? "green" : kpis.max_consec_wins >= 3 ? "yellow" : "muted") },
    { label: "Max Consec Losses", value: kpis.max_consec_losses.toString(), color: colorClass(kpis.max_consec_losses <= 3 ? "green" : kpis.max_consec_losses <= 5 ? "yellow" : "red") },
    { label: "Win Rate", value: `${kpis.win_rate.toFixed(1)}%`, color: colorClass(wrColor(kpis.win_rate)), sub: `${kpis.winning_trades}W / ${kpis.losing_trades}L` },
    { label: "Trades", value: kpis.total_trades.toString(), color: colorClass(tradesColor(kpis.total_trades)) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map(({ label, value, color, sub }) => (
        <div key={label} className="bg-surface border border-border rounded-lg px-4 py-3">
          <div className="text-[11px] text-muted uppercase tracking-wider mb-1">{label}</div>
          <div className={`text-xl font-semibold font-mono ${color}`}>{value}</div>
          {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
        </div>
      ))}
    </div>
  );
}
