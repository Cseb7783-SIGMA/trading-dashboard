"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Trade } from "@/lib/types";
import { C } from "@/lib/colors";

export default function DrawdownChart({ trades }: { trades: Trade[] }) {
  let peak = 0;
  const data = trades.map((t) => {
    if (t.cumulative_pnl > peak) peak = t.cumulative_pnl;
    const dd = peak > 0 ? ((t.cumulative_pnl - peak) / peak) * 100 : 0;
    return { label: t.exit_dt.slice(0, 10), dd: Math.min(dd, 0) };
  });

  const maxDD = Math.min(...data.map((d) => d.dd));

  return (
    <div className="bg-surface border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted uppercase tracking-wider">Drawdown</span>
        <span className="font-mono font-semibold text-sm text-red-400">
          Max : {maxDD.toFixed(2)}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.red} stopOpacity={0.4} />
              <stop offset="95%" stopColor={C.red} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="label" hide />
          <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fill: C.muted, fontSize: 10 }} width={45} />
          <Tooltip
            contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6 }}
            itemStyle={{ color: C.red, fontFamily: "monospace", fontSize: 12 }}
            formatter={(v: number) => [`${v.toFixed(2)}%`, "Drawdown"]}
          />
          <Area type="monotone" dataKey="dd" stroke={C.red} strokeWidth={1.5} fill="url(#ddGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
