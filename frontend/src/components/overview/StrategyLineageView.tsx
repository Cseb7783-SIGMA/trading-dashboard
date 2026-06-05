"use client";
/**
 * StrategyLineageView — vue hiérarchique des stratégies (S61).
 *
 * Hiérarchie :
 *   Famille (concept algo) → Versions (V1/V2/V3) → Assets (QQQ/SPY/NQ/ES)
 *
 * Filtres dans sidebar gauche :
 *   - Style (Scalping/Swing)
 *   - Tier (HIGH/MEDIUM/Archive)
 *   - Stage (Déployées/Non Déployées)
 *   - Période (All-time/12m/3m/1m)
 *   - Catégorie (ETF/Futures/CFD/Forex/Crypto...)
 */
import { useState, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import type { Run } from "@/lib/types";
import {
  groupByLineage,
  countByTier,
  countByStyle,
  countByStage,
  countByCategory,
  type LineageTree,
  type AssetCategory,
} from "@/lib/lineage";

type TierFilter = "all" | "STATISTICALLY_ROBUST" | "HIGH" | "MEDIUM" | "LOW" | "Archive";
type StyleFilter = "all" | "scalping" | "swing";
type StageFilter = "all" | "paper" | "rd";
type CategoryFilter = "all" | AssetCategory;
type PeriodFilter = "all_time" | "12m" | "6m" | "3m" | "1m" | "7d" | "24h";

interface Props {
  runs: Run[];
  onRefresh?: () => void;          // S65 — callback pour re-fetch /runs (optionnel)
  refreshing?: boolean;            // S65 — état pour spinner pendant le fetch
  lastRefreshAt?: string | null;   // S65 — heure de la dernière actualisation (HH:MM:SS)
}

export default function StrategyLineageView({ runs, onRefresh, refreshing, lastRefreshAt }: Props) {
  // Filters state
  const [styleFilter, setStyleFilter] = useState<StyleFilter>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [stageFilter, setStageFilter] = useState<StageFilter>("paper");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all_time");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  // Group runs by lineage (memoized)
  const tree: LineageTree = useMemo(() => groupByLineage(runs), [runs]);

  // S62 — helper : un run tombe-t-il dans la fenêtre période sélectionnée (basé sur created_at) ?
  const isWithinPeriod = (created_at: string | undefined, period: PeriodFilter): boolean => {
    if (period === "all_time" || !created_at) return true;
    const days = { "12m": 365, "6m": 180, "3m": 90, "1m": 30, "7d": 7, "24h": 1 }[period];
    if (!days) return true;
    const ageDays = (Date.now() - new Date(created_at).getTime()) / (1000 * 60 * 60 * 24);
    return ageDays <= days;
  };

  // Helper : filter runs based on selected filters, optionally excluding one section
  // Used to compute "dynamic" counts that reflect cross-filter intersection (S61)
  const filterRunsExcept = (excludeSection: "style" | "tier" | "stage" | "period" | "category" | null) => {
    return tree.flatMap((fam) =>
      fam.versions.flatMap((v) => v.runs)
    ).filter((lr) => {
      if (excludeSection !== "style" && styleFilter !== "all" && lr.run.d033?.style !== styleFilter) return false;
      if (excludeSection !== "tier" && tierFilter !== "all") {
        const t = lr.run.d033?.tier_davey || "Archive";
        if (tierFilter === "Archive" && (t === "STATISTICALLY_ROBUST" || t === "HIGH" || t === "MEDIUM" || t === "LOW")) return false;
        if (tierFilter !== "Archive" && t !== tierFilter) return false;
      }
      if (excludeSection !== "stage") {
        if (stageFilter === "paper" && lr.run.d033?.deployment_stage !== "paper") return false;
        if (stageFilter === "rd" && lr.run.d033?.deployment_stage === "paper") return false;
      }
      if (excludeSection !== "period" && !isWithinPeriod(lr.run.created_at, periodFilter)) return false;
      if (excludeSection !== "category" && categoryFilter !== "all" && lr.category !== categoryFilter) return false;
      return true;
    });
  };

  // Counts DYNAMIQUES — chaque section calcule en excluant son propre filtre
  // (de cette façon le total montré pour la section reste pertinent même filtré ailleurs)
  const styleCounts = useMemo(() => {
    const runs = filterRunsExcept("style");
    let scalping = 0, swing = 0;
    for (const lr of runs) {
      if (lr.run.d033?.style === "scalping") scalping++;
      else if (lr.run.d033?.style === "swing") swing++;
    }
    return { scalping, swing, all: runs.length };
  }, [tree, styleFilter, tierFilter, stageFilter, categoryFilter]);

  const tierCounts = useMemo(() => {
    const runs = filterRunsExcept("tier");
    const c: Record<string, number> = { ALL: runs.length, STATISTICALLY_ROBUST: 0, HIGH: 0, MEDIUM: 0, LOW: 0, Archive: 0 };
    for (const lr of runs) {
      const t = lr.run.d033?.tier_davey || "Archive";
      if (t in c) c[t]++;
      else c.Archive++;
    }
    return c;
  }, [tree, styleFilter, tierFilter, stageFilter, categoryFilter]);

  const stageCounts = useMemo(() => {
    const runs = filterRunsExcept("stage");
    let paper = 0, rd = 0;
    for (const lr of runs) {
      if (lr.run.d033?.deployment_stage === "paper") paper++;
      else rd++;
    }
    return { paper, rd, all: runs.length };
  }, [tree, styleFilter, tierFilter, stageFilter, categoryFilter]);

  const categoryCounts = useMemo(() => {
    const runs = filterRunsExcept("category");
    const c: Record<string, number> = {
      stocks: 0, etf: 0, futures: 0, cfd: 0, indices: 0,
      forex: 0, crypto: 0, commodities: 0, unknown: 0,
    };
    for (const lr of runs) c[lr.category]++;
    return c;
  }, [tree, styleFilter, tierFilter, stageFilter, categoryFilter]);

  // Apply filters to tree (filter runs at the leaf, then prune empty versions/families)
  const filteredTree: LineageTree = useMemo(() => {
    return tree
      .map((fam) => ({
        ...fam,
        versions: fam.versions
          .map((ver) => ({
            ...ver,
            runs: ver.runs.filter((lr) => {
              if (styleFilter !== "all" && lr.run.d033?.style !== styleFilter) return false;
              if (tierFilter !== "all") {
                const t = lr.run.d033?.tier_davey || "Archive";
                if (tierFilter === "Archive" && t in { STATISTICALLY_ROBUST: 1, HIGH: 1, MEDIUM: 1, LOW: 1 }) return false;
                if (tierFilter !== "Archive" && t !== tierFilter) return false;
              }
              if (stageFilter === "paper" && lr.run.d033?.deployment_stage !== "paper") return false;
              if (stageFilter === "rd" && lr.run.d033?.deployment_stage === "paper") return false;
              if (!isWithinPeriod(lr.run.created_at, periodFilter)) return false;
              if (categoryFilter !== "all" && lr.category !== categoryFilter) return false;
              return true;
            }),
          }))
          .filter((ver) => ver.runs.length > 0),
      }))
      .filter((fam) => fam.versions.length > 0);
  }, [tree, styleFilter, tierFilter, stageFilter, periodFilter, categoryFilter]);

  // S62 — Counts dynamiques par période (compteurs à droite des boutons)
  const periodCounts = useMemo(() => {
    const baseRuns = filterRunsExcept("period");
    return {
      all_time: baseRuns.length,
      "12m": baseRuns.filter((lr) => isWithinPeriod(lr.run.created_at, "12m")).length,
      "6m": baseRuns.filter((lr) => isWithinPeriod(lr.run.created_at, "6m")).length,
      "3m": baseRuns.filter((lr) => isWithinPeriod(lr.run.created_at, "3m")).length,
      "1m": baseRuns.filter((lr) => isWithinPeriod(lr.run.created_at, "1m")).length,
      "7d": baseRuns.filter((lr) => isWithinPeriod(lr.run.created_at, "7d")).length,
      "24h": baseRuns.filter((lr) => isWithinPeriod(lr.run.created_at, "24h")).length,
    };
  }, [tree, styleFilter, tierFilter, stageFilter, categoryFilter]);

  return (
    <div className="grid grid-cols-[140px_1fr] gap-4">
      {/* SIDEBAR */}
      <aside className="bg-surface-elevated rounded-lg p-2.5 h-fit sticky top-4">
        {/* S65 — Refresh button : reload simple et fiable */}
        <button
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 mb-2.5 text-[11px] rounded border border-border bg-surface hover:bg-ink hover:border-blue/40 transition-colors"
          aria-label="Actualiser la page"
        >
          <RefreshCw size={11} aria-hidden="true" />
          <span>Actualiser</span>
        </button>
        {/* Style */}
        <FilterSection
          label="Style"
          options={[
            { id: "all", label: "Tous", count: styleCounts.all },
            { id: "scalping", label: "⚡ Scalping", count: styleCounts.scalping, color: "scalping" },
            { id: "swing", label: "📈 Swing", count: styleCounts.swing, color: "swing" },
          ]}
          selected={styleFilter}
          onSelect={(s) => setStyleFilter(s as StyleFilter)}
        />

        <FilterSection
          label="Période"
          options={[
            { id: "24h", label: "24h", count: periodCounts["24h"], color: "info" },
            { id: "all_time", label: "All-time", count: periodCounts.all_time, color: "info" },
            { id: "12m", label: "12 mois", count: periodCounts["12m"] },
            { id: "6m", label: "6 mois", count: periodCounts["6m"] },
            { id: "3m", label: "3 mois", count: periodCounts["3m"] },
            { id: "1m", label: "1 mois", count: periodCounts["1m"] },
            { id: "7d", label: "7 jours", count: periodCounts["7d"] },
          ]}
          selected={periodFilter}
          onSelect={(s) => setPeriodFilter(s as PeriodFilter)}
        />

        <FilterSection
          label="Tier"
          options={[
            { id: "all", label: "Toutes", count: tierCounts.ALL },
            { id: "STATISTICALLY_ROBUST", label: "🏆 ROBUST", count: tierCounts.STATISTICALLY_ROBUST || 0, color: "robust" },
            { id: "HIGH", label: "🥇 HIGH", count: tierCounts.HIGH || 0, color: "high" },
            { id: "MEDIUM", label: "MEDIUM", count: tierCounts.MEDIUM || 0 },
            { id: "LOW", label: "LOW", count: tierCounts.LOW || 0 },
            { id: "Archive", label: "Archive", count: tierCounts.Archive || 0, color: "archive" },
          ]}
          selected={tierFilter}
          onSelect={(s) => setTierFilter(s as TierFilter)}
        />

        <FilterSection
          label="Stage"
          options={[
            { id: "all", label: "Toutes", count: stageCounts.all },
            { id: "paper", label: "🚀 Déployées", count: stageCounts.paper, color: "paper" },
            { id: "rd", label: "📦 Non Déployées", count: stageCounts.rd },
          ]}
          selected={stageFilter}
          onSelect={(s) => setStageFilter(s as StageFilter)}
        />

        <FilterSection
          label="Catégorie"
          options={[
            { id: "all", label: "Toutes", count: Object.values(categoryCounts).reduce((a, b) => a + b, 0) },
            { id: "stocks", label: "Stocks", count: categoryCounts.stocks },
            { id: "etf", label: "ETF", count: categoryCounts.etf },
            { id: "futures", label: "Futures", count: categoryCounts.futures },
            { id: "cfd", label: "CFD", count: categoryCounts.cfd },
            { id: "indices", label: "Indices", count: categoryCounts.indices },
            { id: "forex", label: "Forex", count: categoryCounts.forex },
            { id: "crypto", label: "Crypto", count: categoryCounts.crypto },
            { id: "commodities", label: "Commodities", count: categoryCounts.commodities },
          ]}
          selected={categoryFilter}
          onSelect={(s) => setCategoryFilter(s as CategoryFilter)}
        />
      </aside>

      {/* MAIN CONTENT */}
      <div>
        {/* Active filters indicator */}
        <ActiveFiltersBar
          style={styleFilter}
          tier={tierFilter}
          stage={stageFilter}
          period={periodFilter}
          category={categoryFilter}
          totalRuns={filteredTree.reduce((acc, f) => acc + f.versions.reduce((a, v) => a + v.runs.length, 0), 0)}
        />

        {/* Column header */}
        <div className="grid items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-wider text-muted" style={{ gridTemplateColumns: "90px 1fr 50px 50px 50px 45px 55px" }}>
          <span>Stratégie · Version</span>
          <span></span>
          <span className="text-right">PF</span>
          <span className="text-right">WR</span>
          <span className="text-right">RR</span>
          <span className="text-right">DD</span>
          <span className="text-center">Tier</span>
        </div>

        {/* Lineage tree */}
        {filteredTree.length === 0 ? (
          <div className="text-center text-muted text-sm py-8">Aucune stratégie ne correspond aux filtres.</div>
        ) : (
          filteredTree.map((fam) => (
            <FamilyCard key={fam.family.family_id} family={fam} />
          ))
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

interface FilterSectionProps {
  label: string;
  options: Array<{ id: string; label: string; count: number | null; color?: string }>;
  selected: string;
  onSelect: (id: string) => void;
}

function FilterSection({ label, options, selected, onSelect }: FilterSectionProps) {
  const colorClasses: Record<string, string> = {
    scalping: "bg-red-50 border-red-300 text-red-700",
    swing: "bg-green-50 border-green-300 text-green-700",
    robust: "bg-teal-50 border-teal-300 text-teal-700",
    high: "bg-amber-100 border-2 border-amber-500 text-amber-800",
    paper: "bg-purple-50 border-purple-300 text-purple-700",
    info: "bg-blue-50 border-blue-300 text-blue-700",
    archive: "bg-gray-50 border-gray-300 text-gray-700",
  };

  return (
    <div className="mb-2.5 first:mt-0 [&:not(:first-child)]:pt-2 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border/40">
      <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">{label}</div>
      <div className="flex flex-col gap-1">
        {options.map((opt) => {
          const active = selected === opt.id;
          const colorClass = opt.color && active ? colorClasses[opt.color] : "";
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`flex justify-between items-center px-2 py-1 rounded text-[11px] border transition-colors ${
                active && colorClass
                  ? colorClass + " font-medium"
                  : active
                    ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                    : "bg-surface border-border text-text hover:border-border-strong"
              }`}
            >
              <span>{opt.label}</span>
              {opt.count !== null && <span className="text-muted">{opt.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

interface ActiveFiltersProps {
  style: StyleFilter;
  tier: TierFilter;
  stage: StageFilter;
  period: PeriodFilter;
  category: CategoryFilter;
  totalRuns: number;
}

function ActiveFiltersBar({ style, tier, stage, period, category, totalRuns }: ActiveFiltersProps) {
  const labels: string[] = [];
  if (style !== "all") labels.push(style === "scalping" ? "Scalping" : "Swing");
  if (tier !== "all") labels.push(`tier ${tier}`);
  if (stage === "paper") labels.push("🚀 Déployées");
  if (stage === "rd") labels.push("📦 Non Déployées");
  if (category !== "all") labels.push(category);

  if (labels.length === 0) {
    return (
      <div className="mb-2.5 px-3 py-1.5 bg-surface-elevated rounded text-[11px] text-muted">
        Aucun filtre · {totalRuns} runs
      </div>
    );
  }

  return (
    <div className="mb-2.5 px-3 py-1.5 bg-surface-elevated rounded text-[11px] flex items-center gap-2">
      <span className="text-muted">Filtre :</span>
      <span className="font-medium">{labels.join(" + ")}</span>
      <span className="text-muted">({totalRuns} runs)</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

interface FamilyCardProps {
  family: LineageTree[number];
}

function FamilyCard({ family }: FamilyCardProps) {
  const isPaper = family.any_paper;
  return (
    <div className="bg-surface border border-border rounded-lg mb-2.5 overflow-hidden">
      {/* Family header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-muted">
        <span className="text-sm font-medium text-text">{family.family.family_label}</span>
        {family.family.family_description && (
          <span className="text-[10px] text-muted">— {family.family.family_description}</span>
        )}
        <span className="text-[10px] text-muted ml-2">
          {family.versions.length} version{family.versions.length > 1 ? "s" : ""}
          {family.total_runs > 1 && ` · ${family.total_runs} runs`}
        </span>

      </div>

      {/* Versions */}
      {family.versions.map((ver, idx) => {
        const hasBest = ver.runs.some((r) => r.run.run_id === family.best_run_id);
        const isLast = idx === family.versions.length - 1;
        return (
          <div
            key={ver.version.version_id}
            className={`px-3 py-2 ${hasBest ? "bg-green-50" : ""} ${!isLast ? "border-b border-border/40" : ""}`}
          >
            {/* Version header */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className={`text-xs font-medium ${hasBest ? "text-green-900" : "text-text"}`}>
                <b>{ver.version.version_label.split(" ")[0]}</b> {ver.version.version_label.split(" ").slice(1).join(" ")}
                {hasBest && <span title="Meilleur PF Backtest dans cette famille (≠ Tier ROBUST)" className="cursor-help">{" ⭐"}</span>}
              </span>
              {ver.version.version_description && (
                <span className="text-[10px] text-muted truncate flex-1">
                  {ver.version.version_description}
                </span>
              )}
            </div>

            {/* Asset rows */}
            {ver.runs.map((lr) => (
              <AssetRow key={lr.run.run_id} lr={lr} isBest={lr.run.run_id === family.best_run_id} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

interface AssetRowProps {
  lr: LineageTree[number]["versions"][number]["runs"][number];
  isBest: boolean;
}

function AssetRow({ lr, isBest }: AssetRowProps) {
  const run = lr.run;
  const pf = run.kpis.profit_factor || 0;
  const wr = run.kpis.win_rate || 0;
  const rr = run.kpis.avg_win_loss_ratio || 0;
  const dd = run.kpis.max_drawdown_pct || 0;
  const tier = run.d033?.tier_davey || "Archive";

  const tierStyles: Record<string, string> = {
    STATISTICALLY_ROBUST: "bg-teal-50 text-teal-700",
    HIGH: "bg-amber-100 text-amber-800",
    MEDIUM: "bg-amber-50 text-amber-700",
    LOW: "bg-gray-50 text-gray-700",
    Archive: "bg-red-50 text-red-700",
  };

  return (
    <a
      href={`/strategy/${encodeURIComponent(run.run_id)}`}
      className={`grid items-center gap-1.5 py-1 pl-4 text-[11px] cursor-pointer hover:bg-surface-hover transition-colors ${
        isBest ? "" : "text-muted"
      }`}
      style={{ gridTemplateColumns: "90px 1fr 50px 50px 50px 45px 55px" }}
    >
      <span className={`font-mono text-[10px] ${isBest ? "text-green-900 font-medium" : ""}`}>
        {lr.asset} · {lr.tf}
      </span>
      <span className={`text-[10px] ${isBest ? "text-green-700" : ""}`}>{lr.asset_label}</span>
      <span className={`text-right ${isBest ? "text-green-900 font-medium" : ""}`}>PF {pf.toFixed(2)}</span>
      <span className="text-right">{wr.toFixed(1)}%</span>
      <span className="text-right text-[9px]">1:{rr.toFixed(2)}</span>
      <span className="text-right">{dd.toFixed(1)}%</span>
      <span className="flex items-center justify-center gap-1">
        {isBest && (
          <span title="Meilleur PF Backtest de la famille (≠ Tier ROBUST)" className="cursor-help text-[10px] leading-none">⭐</span>
        )}
        <span className={`text-[9px] px-1 py-0.5 rounded ${tierStyles[tier] || tierStyles.Archive}`}>
          {tier === "STATISTICALLY_ROBUST" ? "ROBUST" : tier}
        </span>
        {run.d033?.deployment_stage === "paper" && (
          <span title="Paper actif" className="text-[10px] leading-none" aria-label="paper actif">🚀</span>
        )}
      </span>
    </a>
  );
}
