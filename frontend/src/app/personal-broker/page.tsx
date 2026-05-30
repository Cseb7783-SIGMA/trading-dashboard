"use client";
import { useState } from "react";
import Link from "next/link";
import LiveAgentCard from "@/components/agents/LiveAgentCard";
import { Briefcase, Play, ChevronRight, Check, Search, X } from "lucide-react";

type BrokerReadyStrategy = {
  id: string;
  name: string;
  version: string;
  instrument: string;
  timeframe: string;
  paperDays: number;
  pf_backtest: number;
  pf_paper: number;
  pf_delta_pct: number;
  dd_backtest: number;
  dd_paper: number;
  sample: string;
};

// Stratégies Broker Ready (Tier STATISTICALLY_ROBUST · Paper confirmé)
// TODO: brancher sur backend /broker-ready (Phase 2 D-033)
const BROKER_READY: BrokerReadyStrategy[] = [
  {
    id: "2026-05-30T151816Z__f10_v1a_avwap_rr3_qqq_15m__s57",
    name: "F10 V1A×AVWAP RR3",
    version: "v1.A-RR3",
    instrument: "QQQ",
    timeframe: "15m",
    paperDays: 12,
    pf_backtest: 2.10,
    pf_paper: 1.95,
    pf_delta_pct: -7,
    dd_backtest: -0.7,
    dd_paper: -1.1,
    sample: "9 trades",
  },
  {
    id: "portfolio_f10_voldelta",
    name: "Portfolio combo F10 + VolDelta",
    version: "50/50",
    instrument: "QQQ",
    timeframe: "15m",
    paperDays: 12,
    pf_backtest: 1.85,
    pf_paper: 1.78,
    pf_delta_pct: -4,
    dd_backtest: -1.1,
    dd_paper: -1.3,
    sample: "16 trades",
  },
];

const MEDAL: Record<number, { label: string; color: string }> = {
  1: { label: "1st", color: "text-yellow-400" },
  2: { label: "2nd", color: "text-slate-400"  },
  3: { label: "3rd", color: "text-orange-400" },
};

const STATS = [
  { label: "Capital alloué",     value: "$0", sub: "pas encore actif" },
  { label: "Stratégies actives", value: "0", sub: `sur ${BROKER_READY.length} ready` },
  { label: "P&L total",          value: "—", sub: "aucun trade" },
  { label: "DD courant",         value: "—", sub: "N/A" },
];

export default function PersonalBrokerPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"scalping" | "swing">("scalping");
  const q = query.trim().toLowerCase();

  // Helper : déduire le style depuis le TF (cohérent règle 1 run = 1 TF = 1 style)
  const styleOf = (tf: string): "scalping" | "swing" => {
    const lower = tf.toLowerCase();
    if (lower.endsWith("m") || lower === "1m" || lower === "5m" || lower === "15m" || lower === "30m" || lower === "2m") return "scalping";
    return "swing";
  };

  const filteredReady = BROKER_READY.filter((s) => {
    if (styleOf(s.timeframe) !== tab) return false;
    if (!q) return true;
    const hay = `${s.name} ${s.version} ${s.instrument} ${s.timeframe}`.toLowerCase();
    return hay.includes(q);
  });

  // Compteurs par style (pour onglets)
  const counts = {
    scalping: BROKER_READY.filter((s) => styleOf(s.timeframe) === "scalping").length,
    swing: BROKER_READY.filter((s) => styleOf(s.timeframe) === "swing").length,
  };

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="text-[11px] text-muted">
        <Link href="/" className="text-blue hover:underline">Laboratoire</Link>
        <ChevronRight size={11} className="inline mx-1 opacity-40" />
        <span>Personal Broker</span>
      </nav>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Briefcase size={22} className="text-blue" />
          <h1 className="text-xl font-semibold">Personal Broker</h1>
          <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 uppercase">
            Compte perso · IBKR
          </span>
        </div>
        <p className="text-xs text-muted mt-0.5">Tes règles · ton capital · activation manuelle</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-lg p-3">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-lg font-semibold text-text">{s.value}</div>
            <div className="text-[10px] text-muted/70 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une stratégie (nom, version, asset, timeframe)…"
          className="w-full bg-surface border border-border rounded-lg text-sm text-text pl-9 pr-9 py-2 focus:border-blue/60 focus:outline-none placeholder:text-muted"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text p-1"
            aria-label="Effacer la recherche"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tabs Scalping / Swing */}
      <div className="flex items-center gap-0 border-b border-border">
        <button
          onClick={() => setTab("scalping")}
          className={`text-sm px-4 py-2 -mb-px border-b-2 transition-colors ${
            tab === "scalping" ? "border-blue text-blue font-medium" : "border-transparent text-muted hover:text-text"
          }`}
        >
          Scalping <span className="text-muted font-normal">({counts.scalping})</span>
        </button>
        <button
          onClick={() => setTab("swing")}
          className={`text-sm px-4 py-2 -mb-px border-b-2 transition-colors ${
            tab === "swing" ? "border-blue text-blue font-medium" : "border-transparent text-muted hover:text-text"
          }`}
        >
          Swing <span className="text-muted font-normal">({counts.swing})</span>
        </button>
      </div>

      {/* Stratégies actives en live */}
      <section className="space-y-2">
        <div className="flex items-baseline gap-3 px-1">
          <h3 className="text-base font-semibold text-green-400 flex items-center gap-1.5">
            <Play size={14} /> Stratégies actives en live
          </h3>
          <span className="text-xs text-muted">(0)</span>
        </div>
        <p className="text-[11px] text-muted px-1">
          Stratégies actuellement déployées sur ton compte IBKR avec capital réel alloué.
        </p>
        <LiveAgentCard agentName="paper-trader" label="Paper Trader (LLM crypto)" color="green" />
      </section>

      {/* Broker Ready */}
      <section className="space-y-2">
        <div className="flex items-baseline gap-3 px-1">
          <h3 className="text-base font-semibold text-purple-300 flex items-center gap-1.5">
            <Check size={14} /> Broker Ready
          </h3>
          <span className="text-xs text-muted">({filteredReady.length} stratégie{filteredReady.length > 1 ? "s" : ""} prête{filteredReady.length > 1 ? "s" : ""} à activer)</span>
        </div>
        <p className="text-[11px] text-muted px-1">
          Tier STATISTICALLY_ROBUST · Paper confirmé · sample suffisant pour live small
        </p>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 w-10">#</th>
                <th className="text-left px-4 py-3">Stratégie</th>
                <th className="text-left px-4 py-3">Univers</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-right px-4 py-3">PF backtest</th>
                <th className="text-right px-4 py-3">PF paper</th>
                <th className="text-right px-4 py-3">DD backtest</th>
                <th className="text-right px-4 py-3">DD paper</th>
                <th className="text-right px-4 py-3">Sample paper</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReady.map((s, idx) => {
                const rank = idx + 1;
                return (
                  <tr
                    key={s.id}
                    className="border-b border-border/50 hover:bg-ink transition-colors group"
                  >
                    <td className="px-4 py-3 text-center">
                      {MEDAL[rank]
                        ? <span className={`text-xs font-semibold tabular-nums ${MEDAL[rank].color}`}>{MEDAL[rank].label}</span>
                        : <span className="text-muted text-xs tabular-nums">{rank}</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/strategy/${encodeURIComponent(s.id)}`} className="block">
                        <div className="font-medium group-hover:text-blue transition-colors">
                          {s.name}
                          <span className="ml-1.5 text-muted text-xs font-normal">{s.version}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold">{s.instrument}</span>
                      <span className="ml-1 text-muted text-xs">{s.timeframe}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-green-500/15 text-green-300 whitespace-nowrap">
                        ✓ Paper {s.paperDays}j
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{s.pf_backtest.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {s.pf_paper.toFixed(2)} <span className="text-[10px] text-green-400">({s.pf_delta_pct}%)</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{s.dd_backtest.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-mono">{s.dd_paper.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-xs text-muted">{s.sample}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-xs font-medium px-2.5 py-1 rounded bg-blue/15 border border-blue/40 text-blue hover:bg-blue/25 transition-colors whitespace-nowrap"
                        onClick={() => alert("Modal de configuration à venir UX7")}
                      >
                        Configurer ↗
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Info footer */}
      <div className="bg-surface border border-border rounded-lg p-3 text-[11px] text-muted leading-relaxed">
        ℹ️ <span className="text-text font-medium">« Configurer ↗ »</span> ouvrira un modal :
        capital alloué, risk per trade (% default 1%), broker IBKR, date démarrage.
        L'activation envoie les ordres réels sur ton compte IBKR.
      </div>
    </main>
  );
}
