"use client";
import { useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Check, Search, X, Play } from "lucide-react";

type PropfirmReadyStrategy = {
  id: string;
  name: string;
  version: string;
  instrument: string;
  timeframe: string;
  pf: number;
  dd: number;
  trades: number;
  prop_score: number;
  win_rate: number;
};

// Stratégies PropFirm Ready
// TODO: brancher sur backend /propfirm-ready (Phase 2 D-033)
const PROPFIRM_READY: PropfirmReadyStrategy[] = [
  {
    id: "2026-05-10T171730Z__agent_v6_iter_01__v1",
    name: "agent_v6_variant",
    version: "v1",
    instrument: "ES", timeframe: "2m",
    pf: 1.36, dd: -9.82, trades: 216, prop_score: 4, win_rate: 52.8,
  },
];

const MEDAL: Record<number, { label: string; color: string }> = {
  1: { label: "1st", color: "text-yellow-400" },
  2: { label: "2nd", color: "text-slate-400"  },
  3: { label: "3rd", color: "text-orange-400" },
};

const STATS = [
  { label: "Compte actif",       value: "—",        sub: "aucun compte FTMO connecté" },
  { label: "Stratégies actives", value: "0",        sub: `sur ${PROPFIRM_READY.length} ready` },
  { label: "DD daily / total",   value: "— / —",    sub: "limites FTMO : 5% / 10%" },
  { label: "P&L challenge",      value: "—",        sub: "objectif : 10% en 30 jours" },
];

export default function PropFirmPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"scalping" | "swing">("scalping");
  const q = query.trim().toLowerCase();

  // Helper : déduire le style depuis le TF (cohérent règle 1 run = 1 TF = 1 style)
  const styleOf = (tf: string): "scalping" | "swing" => {
    const lower = tf.toLowerCase();
    if (lower.endsWith("m") || lower === "1m" || lower === "5m" || lower === "15m" || lower === "30m" || lower === "2m") return "scalping";
    return "swing";
  };
  const filteredReady = PROPFIRM_READY.filter((s) => {
    if (styleOf(s.timeframe) !== tab) return false;
    if (!q) return true;
    const hay = `${s.name} ${s.version} ${s.instrument} ${s.timeframe}`.toLowerCase();
    return hay.includes(q);
  });

  // Compteurs par style (pour onglets)
  const counts = {
    scalping: PROPFIRM_READY.filter((s) => styleOf(s.timeframe) === "scalping").length,
    swing: PROPFIRM_READY.filter((s) => styleOf(s.timeframe) === "swing").length,
  };

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="text-[11px] text-muted">
        <Link href="/" className="text-blue hover:underline">Laboratoire</Link>
        <ChevronRight size={11} className="inline mx-1 opacity-40" />
        <span>PropFirm</span>
      </nav>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Building2 size={22} className="text-green-400" />
          <h1 className="text-xl font-semibold">PropFirm</h1>
          <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded bg-green-500/15 text-green-300 uppercase">
            FTMO · Challenge / Funded
          </span>
        </div>
        <p className="text-xs text-muted mt-0.5">Capital propfirm externe · règles strictes · objectif Funded long-terme</p>
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

      {/* Phase actuelle FTMO */}
      <section className="bg-surface border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Phase FTMO</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-2 bg-ink rounded-full overflow-hidden">
              <div className="h-full w-0 bg-green-400" />
            </div>
            <span className="text-[10px] text-muted whitespace-nowrap">Aucun challenge actif</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
          <div className="px-3 py-2 rounded bg-ink/40 border border-border">
            <div className="font-medium">1. Challenge</div>
            <div className="text-muted">10% target · 30j max · 5% daily DD · 10% total DD</div>
          </div>
          <div className="px-3 py-2 rounded bg-ink/40 border border-border opacity-50">
            <div className="font-medium">2. Verification</div>
            <div className="text-muted">5% target · 60j max · mêmes DD limits</div>
          </div>
          <div className="px-3 py-2 rounded bg-ink/40 border border-border opacity-50">
            <div className="font-medium">3. Funded</div>
            <div className="text-muted">Pas de target · Profit split 80/20</div>
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

      {/* Stratégies actives sur PropFirm */}
      <section className="space-y-2">
        <div className="flex items-baseline gap-3 px-1">
          <h3 className="text-base font-semibold text-green-400 flex items-center gap-1.5">
            <Play size={14} /> Stratégies actives sur PropFirm
          </h3>
          <span className="text-xs text-muted">(0)</span>
        </div>
        <p className="text-[11px] text-muted px-1">
          Stratégies actuellement déployées sur ton compte FTMO Challenge ou Funded.
        </p>
        <div className="bg-surface border border-border border-dashed rounded-lg p-5 text-center text-xs text-muted">
          Aucune stratégie active. Configure et active une stratégie depuis « PropFirm Ready » ci-dessous.
        </div>
      </section>

      {/* PropFirm Ready */}
      <section className="space-y-2">
        <div className="flex items-baseline gap-3 px-1">
          <h3 className="text-base font-semibold text-green-300 flex items-center gap-1.5">
            <Check size={14} /> PropFirm Ready
          </h3>
          <span className="text-xs text-muted">
            ({filteredReady.length} stratégie{filteredReady.length > 1 ? "s" : ""} prête{filteredReady.length > 1 ? "s" : ""} à activer)
          </span>
        </div>
        <p className="text-[11px] text-muted px-1">
          PF ≥ 1.5 · MaxDD ≤ 10% · Trades ≥ 100 · Prop Score ≥ 4/5 — éligible FTMO 100k$
        </p>

        {filteredReady.length === 0 ? (
          <div className="bg-surface border border-border border-dashed rounded-lg p-8 text-center text-xs text-muted">
            Aucune stratégie ne correspond aux critères PropFirm.
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
                  <th className="text-right px-4 py-3">Max DD</th>
                  <th className="text-right px-4 py-3">Trades</th>
                  <th className="text-right px-4 py-3">Win Rate</th>
                  <th className="text-right px-4 py-3">Prop Score</th>
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
                      <td className={`px-4 py-3 text-right font-mono ${s.dd >= -5 ? "text-green-400" : s.dd >= -10 ? "text-amber-400" : "text-red-300"}`}>
                        {s.dd.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{s.trades}</td>
                      <td className="px-4 py-3 text-right font-mono">{s.win_rate.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-green-300">{s.prop_score}/5</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-xs font-medium px-2.5 py-1 rounded bg-blue/15 border border-blue/40 text-blue hover:bg-blue/25 transition-colors whitespace-nowrap"
                          onClick={() => alert("Modal 'Configurer FTMO Challenge' — à venir UX13/Phase 2 D-033")}
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
        ℹ️ <span className="text-text font-medium">Règles FTMO Challenge 100k$</span> :
        Profit target 10% (10 000$) en 30 jours · Daily DD max 5% (5 000$) · Total DD max 10% (10 000$) ·
        Trade min 4 jours sur 30 · Pas de news trading restreint.
      </div>
    </main>
  );
}
