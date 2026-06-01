"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Search, X } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import type { Run } from "@/lib/types";
import { colorClass, ddColor, pfColor, sharpeColor, tradesColor, wrColor } from "@/lib/colors";

type ColKey = "pf" | "dd" | "sharpe" | "wr" | "trades" | "consec_w" | "consec_l" | "score";
type Dir = "asc" | "desc";

const COLS: { key: ColKey; label: string; tooltip: string; higherIsBetter: boolean }[] = [
  { key: "pf",     label: "PF",     tooltip: "Profit Factor — ≥ 1.5 robuste.", higherIsBetter: true  },
  { key: "dd",     label: "DD%",    tooltip: "Drawdown max — FTMO exige < 10%.", higherIsBetter: false },
  { key: "sharpe", label: "Sharpe", tooltip: "Sharpe ≥ 1.0 = bon.", higherIsBetter: true  },
  { key: "wr",     label: "Win%",   tooltip: "Win Rate.", higherIsBetter: true  },
  { key: "trades", label: "Trades", tooltip: "≥ 50 recommandé.", higherIsBetter: true  },
  { key: "consec_w", label: "ConsW", tooltip: "Max consecutive wins.", higherIsBetter: true  },
  { key: "consec_l", label: "ConsL", tooltip: "Max consecutive losses.", higherIsBetter: false },
  { key: "score",  label: "Score",  tooltip: "Score composite /100.", higherIsBetter: true  },
];

// D-033 : sections basées sur tier_davey (qualité statistique Pipeline Davey)
const SECTIONS: { id: string; label: string; emoji: string; color: string; desc: string; initialSort: ColKey }[] = [
  { id: "STATISTICALLY_ROBUST", label: "Statistically Robust", emoji: "🏆", color: "text-amber-300",  desc: "Pipeline Davey 1-5 PASS complet — Train + Walk-Forward + OOS strict + Monte Carlo + Multi-asset. Prêtes pour Paper / Broker.", initialSort: "pf" },
  { id: "HIGH",                 label: "High",                 emoji: "🥇", color: "text-green-400",  desc: "Davey 1-4 PASS — manque OOS strict OU MC. Solides candidats pour validation Paper.", initialSort: "pf" },
  { id: "MEDIUM",               label: "Medium",               emoji: "🥈", color: "text-blue",       desc: "Davey 1-3 PASS — Train + WF stable, OOS marginal. Continuer R&D.", initialSort: "pf" },
  { id: "LOW",                  label: "Low",                  emoji: "🥉", color: "text-muted",      desc: "Train PASS uniquement (PF > 1, sample > seuil). Variantes à explorer.", initialSort: "pf" },
  { id: "Archive",              label: "Archive",              emoji: "🔴", color: "text-red-400",    desc: "Train FAIL ou WF drift définitif. Conservé pour apprentissage T-30.", initialSort: "trades" },
];

// Mapping instrument → catégorie pour les filtres
function categoryOf(instrument: string | undefined): string {
  if (!instrument) return "Autre";
  const i = instrument.toUpperCase().replace("=F", "");
  if (["NQ","ES","RTY","YM","DJ","MNQ","MES","MYM","M2K"].includes(i)) return "Futures";
  if (["CL","GC","SI","NG","HG","ZC","ZW","ZS","ZB","ZN","BRENT","WTI"].includes(i)) return "Commodities";
  if (["QQQ","SPY","IWM","DIA","VTI","VOO","XLF","XLE","XLK","XLV","XLI","XLY","XLP","XLB","XLRE","XLU","XLC","TLT","GLD","SLV"].includes(i)) return "ETF";
  if (i.startsWith("BTC") || i.startsWith("ETH") || i.endsWith("USDT") || i.endsWith("USDC")) return "Crypto";
  if (/^[A-Z]{6}$/.test(i) && i.includes("USD") || /^(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)/.test(i)) return "Forex";
  return "Stocks";
}

const CATEGORY_FILTERS = ["Stocks", "ETF", "Futures", "Forex", "Crypto", "Commodities"];

function getValue(run: Run, key: ColKey): number {
  const k = run.kpis;
  switch (key) {
    case "pf":     return k.profit_factor;
    case "dd":     return k.max_drawdown_pct;
    case "sharpe": return k.sharpe_ratio;
    case "wr":     return k.win_rate;
    case "trades": return k.total_trades;
    case "consec_w": return k.max_consec_wins;
    case "consec_l": return k.max_consec_losses;
    case "score":  return k.composite_score;
  }
}

function SortIcon({ active, dir }: { active: boolean; dir: Dir }) {
  if (!active) return <span className="ml-1 opacity-25 text-[10px]">↕</span>;
  return <span className="ml-1 text-blue text-[10px]">{dir === "desc" ? "↓" : "↑"}</span>;
}

function PropBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5" title={`Prop Score ${score}/5`}>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`w-2 h-2 rounded-sm ${i <= score ? "bg-blue" : "bg-border"}`} />
        ))}
      </div>
      <span className="text-xs text-muted">{score}/5</span>
    </div>
  );
}

function ZCell({ z, trades }: { z: number; trades: number }) {
  const sampleWeak = trades < 50;
  let cls: string;
  let suffix = "";
  let title = "";

  if (z >= 4 && !sampleWeak) {
    cls = "text-green-400 font-semibold";
  } else if (z >= 4 && sampleWeak) {
    cls = "text-amber-400 font-semibold";
    suffix = " ⚠";
    title = `Z ${z}/5 mais sample limité (${trades} trades < 50) — anecdotique, à confirmer sur backtest plus long`;
  } else if (z >= 3 && !sampleWeak) {
    cls = "text-amber-400";
  } else if (z >= 3 && sampleWeak) {
    cls = "text-amber-400/70";
    suffix = " ⚠";
    title = `Z ${z}/5 mais sample limité (${trades} trades < 50)`;
  } else {
    cls = "text-zinc-500";
  }

  return (
    <span className={cls} title={title}>{z}/5{suffix}</span>
  );
}


// D-033 + Period KPIs : extrait les KPIs selon la période sélectionnée
function getKpisForPeriod(run: Run, period: "all_time" | "12m" | "6m" | "3m" | "1m") {
  const periodMap: Record<string, keyof NonNullable<Run["kpis_by_period"]>> = {
    "1m": "1m", "3m": "3m", "6m": "6m", "12m": "12m", "all_time": "all_time"
  };
  const periodKpis = run.kpis_by_period?.[periodMap[period]];
  if (period === "all_time" || !periodKpis) {
    return {
      pf: run.kpis.profit_factor,
      wr: run.kpis.win_rate,
      trades: run.kpis.total_trades,
      dd: run.kpis.max_drawdown_pct,
    };
  }
  return {
    pf: periodKpis.pf ?? 0,
    wr: periodKpis.wr ?? 0,
    trades: periodKpis.trades,
    dd: periodKpis.dd_pct,
  };
}

const MEDAL: Record<number, { label: string; color: string }> = {
  1: { label: "1st", color: "text-yellow-400" },
  2: { label: "2nd", color: "text-slate-400"  },
  3: { label: "3rd", color: "text-orange-400" },
};

function EmptySectionPlaceholder({ section }: { section: typeof SECTIONS[0] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-3 px-1">
        <h3 className={`text-base font-semibold ${section.color}`}>
          {section.emoji} {section.label}
        </h3>
        <span className="text-xs text-muted">(aucune stratégie)</span>
      </div>
      <p className="text-[11px] text-muted px-1">{section.desc}</p>
      <div className="bg-surface border border-border border-dashed rounded-lg p-6 text-center text-xs text-muted">
        Aucune stratégie à ce stade pour l'instant. Elles apparaîtront quand elles atteindront ce niveau du pipeline.
      </div>
    </div>
  );
}

function SectionPanel({
  section, runs, onRunClick, period,
}: {
  section: typeof SECTIONS[0];
  runs: Run[];
  onRunClick: (id: string) => void;
  period: "all_time" | "12m" | "6m" | "3m" | "1m";
}) {
  const [sortKey, setSortKey] = useState<ColKey>(section.initialSort);
  const [sortDir, setSortDir] = useState<Dir>("desc");

  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableWidth, setTableWidth] = useState(0);
  const syncingRef = useRef(false);

  const handleSort = (key: ColKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...runs].sort((a, b) => {
    const va = getValue(a, sortKey);
    const vb = getValue(b, sortKey);
    if (va !== vb) return sortDir === "desc" ? vb - va : va - vb;
    return b.kpis.total_trades - a.kpis.total_trades;
  });

  useEffect(() => {
    if (tableRef.current) {
      setTableWidth(tableRef.current.scrollWidth);
    }
  }, [sorted.length]);

  const handleTopScroll = () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => { syncingRef.current = false; });
  };

  const handleBottomScroll = () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (bottomScrollRef.current && topScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => { syncingRef.current = false; });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-3 px-1">
        <h3 className={`text-base font-semibold ${section.color}`}>
          {section.emoji} {section.label}
        </h3>
        <span className="text-xs text-muted">({sorted.length} stratégie{sorted.length > 1 ? "s" : ""})</span>
      </div>
      <p className="text-[11px] text-muted px-1">{section.desc}</p>

      {/* Top scrollbar (synced) */}
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        className="overflow-x-auto rounded-t-lg border border-border border-b-0"
        style={{ overflowY: "hidden" }}
      >
        <div style={{ width: tableWidth > 0 ? `${tableWidth}px` : "100%", height: "1px" }} />
      </div>

      {/* Table */}
      <div
        ref={bottomScrollRef}
        onScroll={handleBottomScroll}
        className="overflow-x-auto rounded-b-lg border border-border border-t-0"
        style={{ marginTop: 0 }}
      >
        <table ref={tableRef} className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-muted text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 w-10">#</th>
              <th className="text-left px-4 py-3">Stratégie</th>
              <th className="text-left px-4 py-3">Univers</th>
              {COLS.map((col) => (
                <th key={col.key} className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Tooltip label={col.label} text={col.tooltip} />
                    <button onClick={() => handleSort(col.key)} className="flex items-center hover:text-text transition-colors">
                      {col.label}
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((run, idx) => {
              const k = run.kpis;
              const kp = getKpisForPeriod(run, period);
              const rank = idx + 1;
              return (
                <tr
                  key={run.run_id}
                  onClick={() => onRunClick(run.run_id)}
                  className="border-b border-border/50 hover:bg-ink transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3 text-center">
                    {MEDAL[rank]
                      ? <span className={`text-xs font-semibold tabular-nums ${MEDAL[rank].color}`}>{MEDAL[rank].label}</span>
                      : <span className="text-muted text-xs tabular-nums">{rank}</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium group-hover:text-blue transition-colors">
                      {(() => {
                        const stage = run.d033?.deployment_stage ?? "rd";
                        if (stage === "rd") return null;
                        const dotColor: Record<string, string> = {
                          paper:       "bg-purple-500",
                          broker:      "bg-blue-500",
                          propfirm:    "bg-amber-500",
                          challenge_z: "bg-yellow-500",
                        };
                        const title: Record<string, string> = {
                          paper:       "Paper Trade actif",
                          broker:      "Personal Broker actif",
                          propfirm:    "PropFirm FTMO actif",
                          challenge_z: "Challenge Z (TMAFX) actif",
                        };
                        return (
                          <span
                            className="inline-flex items-center gap-1 mr-2 px-1.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 align-middle"
                            title={title[stage] ?? "Déployée"}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor[stage] ?? "bg-purple-500"} animate-pulse`} />
                            <span className="text-[9px] font-semibold text-purple-700 uppercase tracking-wider">Live</span>
                          </span>
                        );
                      })()}
                      {run.strategy.name}
                      <span className="ml-1.5 text-muted text-xs font-normal">{run.strategy.version}</span>
                      {run.drift_status === "critical" && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">⚠ drift</span>}
                      {run.drift_status === "warning" && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">⚠ attention</span>}
                      {run.drift_status === "stable" && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">✓ stable</span>}
                      {(() => {
                        const stage = run.d033?.deployment_stage ?? "rd";
                        if (stage === "rd") return null;
                        const stageMap: Record<string, { label: string; cls: string; dot: string }> = {
                          paper:       { label: "Paper actif",  cls: "bg-purple-50 text-purple-700 border-purple-300", dot: "bg-purple-500" },
                          broker:      { label: "Broker actif", cls: "bg-blue-50 text-blue-700 border-blue-300",     dot: "bg-blue-500" },
                          propfirm:    { label: "FTMO actif",   cls: "bg-amber-50 text-amber-700 border-amber-300",  dot: "bg-amber-500" },
                          challenge_z: { label: "Z actif",      cls: "bg-yellow-50 text-yellow-700 border-yellow-300", dot: "bg-yellow-500" },
                        };
                        const s = stageMap[stage];
                        if (!s) return null;
                        return (
                          <span className={`ml-2 inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-medium ${s.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                        );
                      })()}
                    </div>
                    {run.d033?.eligibility && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {(["paper", "personal_broker", "challenge_z", "propfirm"] as const).map((dest) => {
                          const v = run.d033!.eligibility[dest];
                          if (v === "no") return null;
                          const label = { paper: "Paper", personal_broker: "Broker", challenge_z: "Z", propfirm: "FTMO" }[dest];
                          const cls = v === "yes" ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200";
                          return <span key={dest} className={`text-[9px] px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>;
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold">{run.universe.instrument}</span>
                    <span className="ml-1 text-muted text-xs">{run.universe.timeframe}</span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${colorClass(pfColor(kp.pf))}`}>{kp.pf.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${colorClass(ddColor(kp.dd))}`}>{kp.dd.toFixed(1)}%</td>
                  <td className={`px-4 py-3 text-right font-mono ${colorClass(sharpeColor(k.sharpe_ratio))}`}>{k.sharpe_ratio.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${colorClass(wrColor(kp.wr))}`}>{kp.wr.toFixed(1)}%</td>
                  <td className={`px-4 py-3 text-right font-mono ${colorClass(tradesColor(kp.trades))}`}>{kp.trades}</td>
                  <td className="px-4 py-3 text-right font-mono">{k.max_consec_wins}</td>
                  <td className="px-4 py-3 text-right font-mono">{k.max_consec_losses}</td>
                  <td className="px-4 py-3 text-right"><span className="font-semibold text-blue">{k.composite_score}</span></td>
                  <td className="px-4 py-3 text-muted text-xs group-hover:text-blue transition-colors">→</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// Helper : classifie style (scalping/swing) sans dépendre du backend D033 (S59 — sans restart)
function getStyle(r: Run): "scalping" | "swing" {
  // 1) Si backend a calculé style, l'utiliser
  if (r.d033?.style === "scalping" || r.d033?.style === "swing") return r.d033.style;
  // 2) Sinon, heuristique : haute fréquence = scalping
  const trades = r.kpis?.total_trades ?? 0;
  const tf = (r.universe?.timeframe || "").toLowerCase();
  const tfShort = !(tf.endsWith("h") || tf.endsWith("d") || tf.endsWith("w"));
  // Seuils alignés sur S59 (≥ 0.5 trades/jour approximé via sample size)
  if (tfShort && trades >= 50) return "scalping";
  if (trades >= 200) return "scalping";
  return "swing";
}

export default function Leaderboard({ runs }: { runs: Run[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [period, setPeriod] = useState<"all_time" | "12m" | "6m" | "3m" | "1m">("all_time");
  const [styleFilter, setStyleFilter] = useState<"all" | "scalping" | "swing">("all");
  const [stageFilter, setStageFilter] = useState<"all" | "deployed">("all");

  if (!runs.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted gap-3">
        <Inbox size={36} strokeWidth={1} className="text-border" aria-hidden="true" />
        <div className="text-sm">Aucun run dans <code className="text-xs bg-surface px-1 py-0.5 rounded">results/runs/</code></div>
      </div>
    );
  }

  const handleRunClick = (id: string) => router.push(`/strategy/${encodeURIComponent(id)}`);

  // Filtre global : search + category filter
  const q = query.trim().toLowerCase();
  const deployedCount = runs.filter(r => (r.d033?.deployment_stage ?? "rd") !== "rd").length;

  const filteredRuns = runs.filter(r => {
    // Filtre Stage : Déployées = deployment_stage ≠ "rd"
    if (stageFilter === "deployed") {
      const stage = r.d033?.deployment_stage ?? "rd";
      if (stage === "rd") return false;
    }
    if (styleFilter !== "all" && getStyle(r) !== styleFilter) return false;
    if (categoryFilter && categoryOf(r.universe?.instrument) !== categoryFilter) return false;
    if (!q) return true;
    const haystack = [
      r.strategy?.name ?? "",
      r.universe?.instrument ?? "",
      r.universe?.timeframe ?? "",
      r.strategy?.version ?? "",
      ...(r.tags ?? []),
    ].join(" ").toLowerCase();
    return haystack.includes(q);
  });

  const hasActiveFilter = q.length > 0 || categoryFilter !== null;

  return (
    <div className="space-y-4">
      {/* Search & quick filters */}
      <div className="bg-surface border border-border rounded-lg p-3 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une stratégie (nom, asset, timeframe, tag)…"
            className="w-full bg-ink border border-border rounded text-sm text-text pl-9 pr-9 py-2 focus:border-blue/60 focus:outline-none placeholder:text-muted"
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

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-muted uppercase tracking-wider mr-1">Catégorie :</span>
          {CATEGORY_FILTERS.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                categoryFilter === cat
                  ? "bg-blue/15 border-blue/50 text-blue"
                  : "bg-ink border-border text-muted hover:text-text hover:border-border"
              }`}
            >
              {cat}
            </button>
          ))}
          {hasActiveFilter && (
            <button
              onClick={() => { setQuery(""); setCategoryFilter(null); }}
              className="text-[11px] text-muted hover:text-text underline ml-auto"
            >
              Effacer tous les filtres
            </button>
          )}
        </div>

        {hasActiveFilter && (
          <div className="text-[11px] text-muted">
            <span className="text-text font-medium">{filteredRuns.length}</span> stratégie{filteredRuns.length > 1 ? "s" : ""} trouvée{filteredRuns.length > 1 ? "s" : ""} sur {runs.length} total
            {categoryFilter && <span> · catégorie <span className="text-text font-medium">{categoryFilter}</span></span>}
          </div>
        )}
      </div>

      {/* Onglets Style Scalping/Swing (S59) */}
      <div className="flex items-center gap-0 border-b border-border">
        {(["all", "scalping", "swing"] as const).map((s) => {
          const count = s === "all" ? runs.length : runs.filter(r => getStyle(r) === s).length;
          const label = s === "all" ? "Toutes" : s === "scalping" ? "Scalping" : "Swing";
          return (
            <button
              key={s}
              onClick={() => setStyleFilter(s)}
              className={`text-sm px-4 py-2 -mb-px border-b-2 transition-colors ${
                styleFilter === s ? "border-blue text-blue font-medium" : "border-transparent text-text hover:text-blue"
              }`}
            >
              {label} <span className="text-muted font-normal">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Filtre Stage D-033 (Toutes / Déployées) */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] text-muted uppercase tracking-wider">Stage :</span>
        {([
          { key: "all",      label: `Toutes (${runs.length})` },
          { key: "deployed", label: `🚀 Déployées (${deployedCount})` },
        ] as const).map((s) => (
          <button
            key={s.key}
            onClick={() => setStageFilter(s.key as typeof stageFilter)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${
              stageFilter === s.key
                ? "bg-purple-50 border-purple-300 text-purple-700 font-medium"
                : "bg-ink border-border text-muted hover:text-text"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Toggle période D-033 */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] text-muted uppercase tracking-wider">Période :</span>
        {(["all_time", "12m", "6m", "3m", "1m"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${
              period === p
                ? "bg-blue/15 border-blue/50 text-blue"
                : "bg-ink border-border text-muted hover:text-text"
            }`}
          >
            {p === "all_time" ? "All-time" : p}
          </button>
        ))}
        {period !== "all_time" && (
          <span className="text-[10px] text-amber-400 ml-2">
            ⚠ KPIs recalculés sur fenêtre {period}
          </span>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {SECTIONS.map(section => {
          // D-033 : filtre par tier_davey au lieu de kpis.sections (legacy)
          const sectionRuns = filteredRuns.filter(r => {
            const tier = r.d033?.tier_davey ?? "Archive";
            return tier === section.id;
          });
          // Si filtre actif et section vide, on la cache pour ne pas polluer
          if (hasActiveFilter && sectionRuns.length === 0) return null;
          // Sans filtre actif : afficher placeholder pour sections vides (montre le pipeline complet)
          if (sectionRuns.length === 0) {
            return <EmptySectionPlaceholder key={section.id} section={section} />;
          }
          return (
            <SectionPanel
              key={section.id}
              section={section}
              runs={sectionRuns}
              onRunClick={handleRunClick}
              period={period}
            />
          );
        })}
        {hasActiveFilter && filteredRuns.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted gap-2">
            <Search size={28} strokeWidth={1} className="text-border" aria-hidden="true" />
            <div className="text-sm">Aucune stratégie ne correspond aux filtres</div>
            <div className="text-[11px]">Essaie un autre terme ou clique &quot;Effacer tous les filtres&quot;</div>
          </div>
        )}
      </div>

      <div className="text-[11px] text-muted text-center pt-2">
        Total : {runs.length} stratégie{runs.length > 1 ? "s" : ""} · Chaque section a son tri propre · Cliquez sur une colonne pour trier
      </div>
    </div>
  );
}
