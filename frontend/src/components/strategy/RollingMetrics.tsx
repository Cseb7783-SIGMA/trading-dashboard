"use client";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Trade } from "@/lib/types";
import { C } from "@/lib/colors";

const WINDOW = 20;

export default function RollingMetrics({ trades }: { trades: Trade[] }) {
  if (trades.length < WINDOW) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="text-xs text-muted uppercase tracking-wider mb-3">Rolling {WINDOW} trades — PF & Win%</div>
        <div className="flex items-center justify-center h-32 text-muted text-xs">Minimum {WINDOW} trades requis ({trades.length} disponibles)</div>
      </div>
    );
  }

  const data = trades.slice(WINDOW - 1).map((_, idx) => {
    const window = trades.slice(idx, idx + WINDOW);
    const wins = window.filter((t) => t.pnl_usd > 0);
    const losses = window.filter((t) => t.pnl_usd <= 0);
    const grossWin = wins.reduce((s, t) => s + t.pnl_usd, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl_usd, 0));
    const pf = grossLoss === 0 ? grossWin : grossWin / grossLoss;
    const wr = (wins.length / WINDOW) * 100;
    return {
      trade: idx + WINDOW,
      pf: parseFloat(pf.toFixed(3)),
      wr: parseFloat(wr.toFixed(1)),
    };
  });

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="text-xs text-muted uppercase tracking-wider mb-3">Rolling {WINDOW} trades — PF & Win%</div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="trade" tick={{ fill: C.muted, fontSize: 10 }} />
          <YAxis yAxisId="pf" tick={{ fill: C.muted, fontSize: 10 }} width={36} domain={[0, "auto"]} />
          <YAxis yAxisId="wr" orientation="right" tick={{ fill: C.muted, fontSize: 10 }} width={36} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }}
            labelStyle={{ color: C.muted }}
            formatter={(val: number, name: string) => [name === "pf" ? val.toFixed(2) : `${val.toFixed(1)}%`, name === "pf" ? "PF" : "Win%"]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} formatter={(v) => v === "pf" ? "PF (gauche)" : "Win% (droite)"} />
          <ReferenceLine yAxisId="pf" y={1} stroke={C.border} strokeDasharray="4 4" />
          <ReferenceLine yAxisId="wr" y={50} stroke={C.border} strokeDasharray="4 4" />
          <Line yAxisId="pf" type="monotone" dataKey="pf" stroke={C.blue} strokeWidth={1.5} dot={false} name="pf" />
          <Line yAxisId="wr" type="monotone" dataKey="wr" stroke={C.muted} strokeWidth={1.5} dot={false} name="wr" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
