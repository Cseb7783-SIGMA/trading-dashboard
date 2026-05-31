"use client";
import Link from "next/link";
import { useState } from "react";
import { Sparkles, ChevronRight, Activity, Eye, MessageCircle, Lightbulb } from "lucide-react";

// Mock data — à brancher backend Phase ultérieure
const MOCK_DATA = {
  today: 0.43,
  last7d: 12.85,
  thisMonth: 47.12,
  lifetime: 156.23,
  projection: 63,
  budgetMonthly: 200,
  avgPerDay: 1.84,
  hourlyRate: 0.18,
  startDate: "avr 2026",

  sources: [
    {
      name: "Agents LLM (Chedly)",
      subtitle: "Paper Trader · PropFirm · Challenge Z",
      icon: Activity,
      color: "#185FA5",
      calls: 8432,
      tokensIn: "12.4M",
      tokensOut: "0.8M",
      cost: 33.92,
      pct: 72,
    },
    {
      name: "Scout Analyzer",
      subtitle: "Évaluation items inbox (Haiku)",
      icon: Eye,
      color: "#534AB7",
      calls: 47,
      tokensIn: "1.2M",
      tokensOut: "0.05M",
      cost: 7.07,
      pct: 15,
    },
    {
      name: "Assistant IA",
      subtitle: "Page dédiée Recherche (Sonnet)",
      icon: MessageCircle,
      color: "#BA7517",
      calls: 12,
      tokensIn: "0.8M",
      tokensOut: "0.2M",
      cost: 5.18,
      pct: 11,
    },
    {
      name: "Drawer IA contextuel",
      subtitle: "Bouton flottant pages (Haiku)",
      icon: Sparkles,
      color: "#27500A",
      calls: 6,
      tokensIn: "0.2M",
      tokensOut: "0.03M",
      cost: 0.95,
      pct: 2,
    },
  ],
};

// Données simulées pour le graphique 30j (cumul croissant)
const DAILY_30D = [0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 0.9, 1.0, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2, 2.1, 2.3, 2.4, 2.6, 2.4, 2.6, 2.8, 2.9, 3.0, 3.1, 2.8, 3.0, 3.2, 3.1, 3.3];

function CostChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const w = 700, h = 160, padLeft = 30, padRight = 5, padTop = 10, padBottom = 25;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  const step = chartW / (data.length - 1);

  const points = data.map((v, i) => {
    const x = padLeft + i * step;
    const y = padTop + chartH - (v / max) * chartH;
    return { x, y };
  });

  const pathLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const pathArea = pathLine + ` L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <line x1={padLeft} y1={padTop + chartH * 0.25} x2={w - padRight} y2={padTop + chartH * 0.25} stroke="var(--color-border-tertiary)" strokeWidth="0.5" strokeDasharray="3 3"/>
      <line x1={padLeft} y1={padTop + chartH * 0.5} x2={w - padRight} y2={padTop + chartH * 0.5} stroke="var(--color-border-tertiary)" strokeWidth="0.5" strokeDasharray="3 3"/>
      <line x1={padLeft} y1={padTop + chartH * 0.75} x2={w - padRight} y2={padTop + chartH * 0.75} stroke="var(--color-border-tertiary)" strokeWidth="0.5" strokeDasharray="3 3"/>
      <text x="5" y={padTop + chartH * 0.25 + 4} fontSize="9" fill="var(--color-text-tertiary)">${(max * 0.75).toFixed(1)}</text>
      <text x="5" y={padTop + chartH * 0.5 + 4} fontSize="9" fill="var(--color-text-tertiary)">${(max * 0.5).toFixed(1)}</text>
      <text x="5" y={padTop + chartH * 0.75 + 4} fontSize="9" fill="var(--color-text-tertiary)">${(max * 0.25).toFixed(1)}</text>
      <path d={pathArea} fill="#185FA5" opacity="0.08"/>
      <path d={pathLine} stroke="#185FA5" strokeWidth="2" fill="none"/>
      <text x={padLeft} y={h - 5} fontSize="9" fill="var(--color-text-tertiary)">il y a 30j</text>
      <text x={padLeft + chartW * 0.5 - 20} y={h - 5} fontSize="9" fill="var(--color-text-tertiary)">il y a 15j</text>
      <text x={w - 60} y={h - 5} fontSize="9" fill="var(--color-text-tertiary)">aujourd&apos;hui</text>
    </svg>
  );
}

export default function UsageClaudePage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const d = MOCK_DATA;

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <nav className="text-[11px] text-muted">
        <Link href="/" className="text-blue hover:underline">Laboratoire</Link>
        <ChevronRight size={11} className="inline mx-1 opacity-40" />
        <span>Usage Claude</span>
      </nav>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <Sparkles size={22} className="text-blue" />
          <h1 className="text-xl font-semibold">Usage Claude</h1>
        </div>
        <p className="text-xs text-muted mt-0.5">Suivi des dépenses API Anthropic — Scout Analyzer, Assistant IA, agents LLM</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Aujourd&apos;hui</div>
          <div className="text-xl font-semibold">${d.today.toFixed(2)}</div>
          <div className="text-[10px] text-green-400 mt-0.5">~${d.hourlyRate.toFixed(2)}/h actuellement</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">7 derniers jours</div>
          <div className="text-xl font-semibold">${d.last7d.toFixed(2)}</div>
          <div className="text-[10px] text-muted/70 mt-0.5">moyenne ${d.avgPerDay.toFixed(2)}/jour</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Mois courant</div>
          <div className="text-xl font-semibold">${d.thisMonth.toFixed(2)}</div>
          <div className="text-[10px] text-amber-400 mt-0.5">projection : ${d.projection} / budget ${d.budgetMonthly}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Total à vie</div>
          <div className="text-xl font-semibold">${d.lifetime.toFixed(2)}</div>
          <div className="text-[10px] text-muted/70 mt-0.5">depuis {d.startDate}</div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <strong className="text-sm font-medium">Évolution coût quotidien — 30 derniers jours</strong>
          <div className="flex gap-1.5 text-[11px]">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded ${period === p ? "bg-blue/15 text-blue font-medium" : "bg-surface-hover text-muted hover:bg-border"}`}
              >
                {p.replace("d", "j")}
              </button>
            ))}
          </div>
        </div>
        <CostChart data={DAILY_30D} />
      </div>

      <div className="bg-surface border border-border rounded-lg p-4">
        <strong className="text-sm font-medium block mb-3">Breakdown par source ({period === "7d" ? "7 derniers jours" : period === "30d" ? "30 derniers jours" : "90 derniers jours"})</strong>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-[11px] uppercase tracking-wider">
              <th className="text-left px-2 py-2 font-medium">Source</th>
              <th className="text-right px-2 py-2 font-medium">Appels</th>
              <th className="text-right px-2 py-2 font-medium">Tokens</th>
              <th className="text-right px-2 py-2 font-medium">Coût</th>
              <th className="text-right px-2 py-2 font-medium">Part</th>
            </tr>
          </thead>
          <tbody>
            {d.sources.map((s, idx) => {
              const Icon = s.icon;
              return (
                <tr key={idx} className="border-b border-border/50">
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <Icon size={14} style={{ color: s.color }} />
                      <span className="font-medium">{s.name}</span>
                    </div>
                    <div className="text-[10px] text-muted ml-6 mt-0.5">{s.subtitle}</div>
                  </td>
                  <td className="px-2 py-3 text-right font-mono">{s.calls.toLocaleString()}</td>
                  <td className="px-2 py-3 text-right font-mono text-xs">{s.tokensIn} in / {s.tokensOut} out</td>
                  <td className="px-2 py-3 text-right font-mono font-medium">${s.cost.toFixed(2)}</td>
                  <td className="px-2 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-14 h-1 bg-border rounded">
                        <span className="block h-1 rounded" style={{ width: `${s.pct}%`, background: s.color }}></span>
                      </span>
                      <span className="text-xs">{s.pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <td className="px-2 py-3 font-medium">Total</td>
              <td className="px-2 py-3 text-right font-mono font-medium">{d.sources.reduce((acc, s) => acc + s.calls, 0).toLocaleString()}</td>
              <td className="px-2 py-3 text-right font-mono text-xs text-muted">14.6M / 1.08M</td>
              <td className="px-2 py-3 text-right font-mono font-medium">${d.sources.reduce((acc, s) => acc + s.cost, 0).toFixed(2)}</td>
              <td className="px-2 py-3 text-right font-mono">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="bg-surface border border-border rounded-lg p-4">
        <strong className="text-sm font-medium block mb-3">Paramètres</strong>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-muted block mb-1">Budget mensuel max</label>
            <div className="flex items-center gap-2">
              <input type="text" defaultValue="$200" className="w-24 bg-ink border border-border rounded px-2 py-1 text-sm" />
              <span className="text-[11px] text-muted">alerte si dépassé ({d.thisMonth.toFixed(2)} / {d.budgetMonthly})</span>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted block mb-1">Modèle par défaut</label>
            <select className="bg-ink border border-border rounded px-2 py-1 text-sm w-full max-w-xs">
              <option>claude-haiku-4-5 (rapide, économique)</option>
              <option>claude-sonnet-4-6 (équilibré)</option>
              <option>claude-opus-4-6 (qualité max)</option>
            </select>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted leading-relaxed">
          <Lightbulb size={11} className="inline mr-1" /> <strong className="text-text font-medium">Conseil</strong> : les agents Chedly consomment 72% du budget.
          Si tu veux réduire, augmente leur interval (60s → 300s = ÷5 le coût).
        </div>
      </div>

      <div className="text-[10px] text-muted/70 text-center italic">
        Données mockées · branchement backend prévu Phase ultérieure (endpoint /usage/cost-summary)
      </div>
    </main>
  );
}
