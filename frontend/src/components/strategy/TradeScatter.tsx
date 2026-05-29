"use client";
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import type { Trade } from "@/lib/types";
import { C } from "@/lib/colors";

export default function TradeScatter({ trades }: { trades: Trade[] }) {
  const wins = trades.filter((t) => t.pnl_usd > 0).map((t, i) => ({ x: t.trade_id, y: t.pnl_usd }));
  const losses = trades.filter((t) => t.pnl_usd <= 0).map((t, i) => ({ x: t.trade_id, y: t.pnl_usd }));

  return (
    <div className="bg-surface border border-border rounded-lg p-4 mb-4">
      <div className="text-xs text-muted uppercase tracking-wider mb-3">Distribution des Trades</div>
      <ResponsiveContainer width="100%" height={130}>
        <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="x" name="Trade" tick={{ fill: C.muted, fontSize: 10 }} label={{ value: "# Trade", position: "insideBottomRight", fill: C.muted, fontSize: 10 }} />
          <YAxis dataKey="y" tickFormatter={(v) => `$${v}`} tick={{ fill: C.muted, fontSize: 10 }} width={55} />
          <ReferenceLine y={0} stroke={C.border} strokeWidth={1} />
          <Tooltip
            contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6 }}
            itemStyle={{ fontFamily: "monospace", fontSize: 12 }}
            formatter={(v: number) => [`$${v.toFixed(2)}`, "PnL"]}
          />
          <Scatter data={wins} fill={C.green} opacity={0.75} r={4} />
          <Scatter data={losses} fill={C.red} opacity={0.75} r={4} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
