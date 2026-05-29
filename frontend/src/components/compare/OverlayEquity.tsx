"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RunDetail } from "@/lib/types";
import { C } from "@/lib/colors";

const COLORS = [C.blue, C.green, "#F97316", "#A855F7", "#EC4899"];

export default function OverlayEquity({ runs }: { runs: RunDetail[] }) {
  if (!runs.length) return null;

  const maxLen = Math.max(...runs.map((r) => r.trades.length));
  const data = Array.from({ length: maxLen + 1 }, (_, i) => {
    const pt: Record<string, number | string> = { i };
    runs.forEach((r) => {
      const trade = r.trades[i - 1];
      pt[r.run_id] = i === 0 ? 0 : (trade?.cumulative_pnl ?? r.trades[r.trades.length - 1]?.cumulative_pnl ?? 0);
    });
    return pt;
  });

  return (
    <div className="bg-surface border border-border rounded-lg p-4 mb-4">
      <div className="text-xs text-muted uppercase tracking-wider mb-3">Equity Curves superposées</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="i" hide />
          <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tick={{ fill: C.muted, fontSize: 10 }} width={70} />
          <Tooltip
            contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6 }}
            labelStyle={{ color: C.muted, fontSize: 11 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
          {runs.map((r, idx) => (
            <Line
              key={r.run_id}
              type="monotone"
              dataKey={r.run_id}
              name={`${r.strategy.name} · ${r.universe.instrument}`}
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth={1.5}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
