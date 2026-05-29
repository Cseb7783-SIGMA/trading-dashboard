"use client";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Trade } from "@/lib/types";
import { C } from "@/lib/colors";

export default function EquityCurve({ trades }: { trades: Trade[] }) {
  const data = [
    { label: "0", pnl: 0 },
    ...trades.map((t) => ({
      label: t.exit_dt.slice(0, 10),
      pnl: t.cumulative_pnl,
    })),
  ];

  const final = data[data.length - 1]?.pnl ?? 0;
  const max = Math.max(...data.map((d) => d.pnl));
  const min = Math.min(...data.map((d) => d.pnl));
  const color = final >= 0 ? C.green : C.red;
  const pct = final !== 0 && trades[0]
    ? ((final / (trades[0].cumulative_pnl - trades[0].pnl_usd + 10000)) * 100)
    : 0;

  return (
    <div className="bg-surface border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs text-muted uppercase tracking-wider">Equity Curve</span>
          <span className="ml-3 text-[11px] text-muted">{trades.length} trades</span>
        </div>
        <div className="text-right">
          <span className={`font-mono font-semibold text-sm ${final >= 0 ? "text-green-400" : "text-red-400"}`}>
            {final >= 0 ? "+" : ""}${final.toLocaleString("fr-CA", { minimumFractionDigits: 0 })}
          </span>
          <span className="ml-2 text-xs text-muted">
            Max ${max.toLocaleString()} · Min ${min.toLocaleString()}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
          <XAxis dataKey="label" hide />
          <YAxis
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: C.muted, fontSize: 10 }}
            width={48}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine y={0} stroke={C.border} strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ background: "#111", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }}
            labelStyle={{ color: C.muted }}
            itemStyle={{ color, fontFamily: "IBM Plex Mono, monospace" }}
            formatter={(v: number) => [`$${v.toLocaleString()}`, "PnL cumulé"]}
          />
          <Area
            type="monotone"
            dataKey="pnl"
            stroke={color}
            strokeWidth={2}
            fill="url(#equityGrad)"
            dot={false}
            activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
