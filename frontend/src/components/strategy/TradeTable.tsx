"use client";
import { useState } from "react";
import type { Trade } from "@/lib/types";

const PAGE = 20;

export default function TradeTable({ trades }: { trades: Trade[] }) {
  const [page, setPage] = useState(0);
  const slice = trades.slice(page * PAGE, (page + 1) * PAGE);
  const pages = Math.ceil(trades.length / PAGE);

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs text-muted uppercase tracking-wider">Trades ({trades.length})</span>
        {pages > 1 && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="hover:text-text disabled:opacity-30">←</button>
            <span>{page + 1} / {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page === pages - 1} className="hover:text-text disabled:opacity-30">→</button>
          </div>
        )}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-muted">
            <th className="text-left px-3 py-2">#</th>
            <th className="text-left px-3 py-2">Entrée</th>
            <th className="text-left px-3 py-2">Sortie</th>
            <th className="text-left px-3 py-2">Dir.</th>
            <th className="text-right px-3 py-2">PnL $</th>
            <th className="text-right px-3 py-2">PnL%</th>
            <th className="text-right px-3 py-2">Barres</th>
            <th className="text-right px-3 py-2">Cumulé</th>
          </tr>
        </thead>
        <tbody>
          {slice.map((t) => (
            <tr key={t.trade_id} className={`border-b border-border/50 ${t.pnl_usd > 0 ? "hover:bg-green/5" : "hover:bg-red/5"}`}>
              <td className="px-3 py-2 text-muted">{t.trade_id}</td>
              <td className="px-3 py-2 font-mono text-muted">{t.entry_dt.slice(0, 16).replace("T", " ")}</td>
              <td className="px-3 py-2 font-mono text-muted">{t.exit_dt.slice(0, 16).replace("T", " ")}</td>
              <td className="px-3 py-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.direction === "LONG" ? "bg-green/10 text-green-400" : "bg-red/10 text-red-400"}`}>
                  {t.direction}
                </span>
              </td>
              <td className={`px-3 py-2 text-right font-mono font-semibold ${t.pnl_usd > 0 ? "text-green-400" : "text-red-400"}`}>
                {t.pnl_usd > 0 ? "+" : ""}${t.pnl_usd.toFixed(2)}
              </td>
              <td className={`px-3 py-2 text-right font-mono ${t.pnl_pct > 0 ? "text-green-400" : "text-red-400"}`}>
                {(t.pnl_pct * 100).toFixed(2)}%
              </td>
              <td className="px-3 py-2 text-right text-muted">{t.bars_held}</td>
              <td className={`px-3 py-2 text-right font-mono ${t.cumulative_pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                ${t.cumulative_pnl.toFixed(0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
