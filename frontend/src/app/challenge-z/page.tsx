"use client";
import { useState } from "react";
import Link from "next/link";
import LiveAgentCard from "@/components/agents/LiveAgentCard";
import { Trophy, ChevronRight, Check, Search, X, Play } from "lucide-react";

type ChallengeZStrategy = {
  id: string;
  name: string;
  version: string;
  instrument: string;
  timeframe: string;
  pf: number;
  trades: number;
  win_rate: number;
  consec_w: number;
  consec_l: number;
  z_score: number;
};

// Stratégies Challenge Z Compatible
// TODO: brancher sur backend /challenge-z-ready (Phase 2 D-033)
const CHALLENGE_Z_READY: ChallengeZStrategy[] = [
  {
    id: "2026-05-28T120100Z__f1_v1a_rr3_qqq__s54",
    name: "F1 V1.A RR 3.0 QQQ",
    version: "v1.A-RR3",
    instrument: "QQQ", timeframe: "15m",
    pf: 1.43, trades: 126, win_rate: 34.1,
    consec_w: 8, consec_l: 3, z_score: 3,
  },
];

const MEDAL: Record<number, { label: string; color: string }> = {
  1: { label: "1st", color: "text-yellow-400" },
  2: { label: "2nd", color: "text-slate-400"  },
  3: { label: "3rd", color: "text-orange-400" },
};

const STATS = [
  { label: "Climb actif",        value: "—",     sub: "aucun TMAFX connecté" },
  { label: "Stratégies actives", value: "0",     sub: `sur ${CHALLENGE_Z_READY.length} ready` },
  { label: "Étape courante",     value: "—",     sub: "Climb 1 / 2 / 3" },
  { label: "P&L Climb",          value: "—",     sub: "objectif step 8%" },
];

export default function ChallengeZPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"scalping" | "swing">("scalping");
  const q = query.trim().toLowerCase();

  // Helper : déduire le style depuis le TF (cohérent règle 1 run = 1 TF = 1 style)
  const styleOf = (tf: string): "scalping" | "swing" => {
    const lower = tf.toLowerCase();
    if (lower.endsWith("m") || lower === "1m" || lower === "5m" || lower === "15m" || lower === "30m" || lower === "2m") return "scalping";
    return "swing";
  };
  const filteredReady = CHALLENGE_Z_READY.filter((s) => {
    if (styleOf(s.timeframe) !== tab) return false;
    if (!q) return true;
    const hay = `${s.name} ${s.version} ${s.instrument} ${s.timeframe}`.toLowerCase();
    return hay.includes(q);
  });

  // Compteurs par style (pour onglets)
  const counts = {
    scalping: CHALLENGE_Z_READY.filter((s) => styleOf(s.timeframe) === "scalping").length,
    swing: CHALLENGE_Z_READY.filter((s) => styleOf(s.timeframe) === "swing").length,
  };

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="text-[11px] text-muted">
        <Link href="/" className="text-blue hover:underline">Laboratoire</Link>
        <ChevronRight size={11} className="inline mx-1 opacity-40" />
        <span>Challenge Z</span>
      </nav>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Trophy size={22} className="text-amber-400" />
          <h1 className="text-xl font-semibold">Challenge Z</h1>
          <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 uppercase">
            TMAFX · Climb
          </span>
        </div>
        <p className="text-xs text-muted mt-0.5">Climb TMAFX · progression par paliers · règles ConsW / ConsL strictes</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-lg p-3">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-lg font-semibold">{s.value}</div>
            <div className="text-[10px] text-muted/70 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Phases TMAFX Climb */}
      <section className="bg-surface border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Phases TMAFX Climb Z</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-ink rounded-full overflow-hidden">
            <div className="h-full w-0 bg-amber-400" />
          </div>
          <span className="text-[10px] text-muted whitespace-nowrap">Aucun Climb actif</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
          <div className="px-3 py-2 rounded bg-ink/40 border border-border">
            <div className="font-medium">1. Climb 1</div>
            <div className="text-muted">Step 8% · ConsW ≥ 5 · ConsL ≤ 3</div>
          </div>
          <div className="px-3 py-2 rounded bg-ink/40 border border-border opacity-50">
            <div className="font-medium">2. Climb 2</div>
            <div className="text-muted">Step 8% · mêmes règles · capital doublé</div>
          </div>
          <div className="px-3 py-2 rounded bg-ink/40 border border-border opacity-50">
            <div className="font-medium">3. Funded</div>
            <div className="text-muted">Pas de target · profit split</div>
          </div>
        </div>
      </section>

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

      {/* Stratégies actives Challenge Z */}
      <section className="space-y-2">
        <div className="flex items-baseline gap-3 px-1">
          <h3 className="text-base font-semibold text-green-400 flex items-center gap-1.5">
            <Play size={14} /> Stratégies actives sur Challenge Z
          </h3>
          <span className="text-xs text-muted">(0)</span>
        </div>
        <p className="text-[11px] text-muted px-1">
          Stratégies actuellement déployées sur ton Climb TMAFX en cours.
        </p>
        <LiveAgentCard agentName="challenge-z-trader" label="Challenge Z TMAFX Agent" color="amber" />
      </section>

      {/* Challenge Z Compatible */}
      <section className="space-y-2">
        <div className="flex items-baseline gap-3 px-1">
          <h3 className="text-base font-semibold text-amber-300 flex items-center gap-1.5">
            <Check size={14} /> Challenge Z Compatible
          </h3>
          <span className="text-xs text-muted">
            ({filteredReady.length} stratégie{filteredReady.length > 1 ? "s" : ""} prête{filteredReady.length > 1 ? "s" : ""} à activer)
          </span>
        </div>
        <p className="text-[11px] text-muted px-1">
          Z Score ≥ 3/5 ET trades ≥ 50 — compatibilité TMAFX statistiquement crédible · ConsW ≥ 5 · ConsL ≤ 3
        </p>

        {filteredReady.length === 0 ? (
          <div className="bg-surface border border-border border-dashed rounded-lg p-8 text-center text-xs text-muted">
            Aucune stratégie ne correspond aux critères Challenge Z.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 w-10">#</th>
                  <th className="text-left px-4 py-3">Stratégie</th>
                  <th className="text-left px-4 py-3">Univers</th>
                  <th className="text-right px-4 py-3">PF</th>
                  <th className="text-right px-4 py-3">Trades</th>
                  <th className="text-right px-4 py-3">Win Rate</th>
                  <th className="text-right px-4 py-3">ConsW</th>
                  <th className="text-right px-4 py-3">ConsL</th>
                  <th className="text-right px-4 py-3">Z Score</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReady.map((s, idx) => {
                  const rank = idx + 1;
                  return (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-ink transition-colors group">
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
                      <td className="px-4 py-3 text-right font-mono">{s.pf.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">{s.trades}</td>
                      <td className="px-4 py-3 text-right font-mono">{s.win_rate.toFixed(1)}%</td>
                      <td className={`px-4 py-3 text-right font-mono ${s.consec_w >= 5 ? "text-green-400" : "text-amber-400"}`}>
                        {s.consec_w}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${s.consec_l <= 3 ? "text-green-400" : "text-red-300"}`}>
                        {s.consec_l}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-300">{s.z_score}/5</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-xs font-medium px-2.5 py-1 rounded bg-blue/15 border border-blue/40 text-blue hover:bg-blue/25 transition-colors whitespace-nowrap"
                          onClick={() => alert("Modal 'Configurer Climb Z' — à venir UX13/Phase 2 D-033")}
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
        )}
      </section>

      {/* Info footer */}
      <div className="bg-surface border border-border rounded-lg p-3 text-[11px] text-muted leading-relaxed">
        ℹ️ <span className="text-text font-medium">Règles TMAFX Climb Z</span> :
        Step profit 8% par palier · Consécutives wins ≥ 5 requis · Consécutives losses ≤ 3 limite ·
        Progression palier-par-palier (Climb 1 → 2 → Funded) · Pas de daily DD strict comme FTMO.
      </div>
    </main>
  );
}
