"use client";
import { useEffect, useState } from "react";
import { fetchRuns, fetchRun } from "@/lib/api";
import type { Run, RunDetail } from "@/lib/types";
import OverlayEquity from "@/components/compare/OverlayEquity";
import CompareTable from "@/components/compare/CompareTable";

const INSTRUMENTS = ["ES", "NQ", "RTY"];
const MAX_SELECT = 5;

const SECTIONS = [
  { id: "propfirm",     label: "PropFirm Ready",        emoji: "🏛️", color: "text-green-400" },
  { id: "challenge_z",  label: "Challenge Z Compatible", emoji: "🎯", color: "text-amber-400" },
  { id: "construction", label: "Atelier",           emoji: "🔨", color: "text-blue" },
];

export default function ComparePage() {
  const [allRuns, setAllRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Map<string, RunDetail>>(new Map());
  const [loadingDetail, setLoadingDetail] = useState<Set<string>>(new Set());
  const [instrument, setInstrument] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRuns()
      .then(setAllRuns)
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (runId: string) => {
    const next = new Set(selected);
    if (next.has(runId)) {
      next.delete(runId);
      setSelected(next);
    } else {
      next.add(runId);
      setSelected(next);
      if (!details.has(runId)) {
        setLoadingDetail((s) => new Set(s).add(runId));
        try {
          const detail = await fetchRun(runId);
          setDetails((prev) => new Map(prev).set(runId, detail));
        } finally {
          setLoadingDetail((s) => { const n = new Set(s); n.delete(runId); return n; });
        }
      }
    }
  };

  const filtered = instrument
    ? allRuns.filter((r) => r.universe.instrument === instrument)
    : allRuns;

  const selectedRuns = allRuns.filter((r) => selected.has(r.run_id));
  const selectedDetails = Array.from(selected)
    .map((id) => details.get(id))
    .filter(Boolean) as RunDetail[];

  const atMax = selected.size >= MAX_SELECT;
  const loadingAny = loadingDetail.size > 0;

  const renderRunButton = (run: Run) => {
    const isSelected = selected.has(run.run_id);
    const isLoading = loadingDetail.has(run.run_id);
    const disabled = !isSelected && atMax;
    return (
      <button
        key={run.run_id}
        onClick={() => toggle(run.run_id)}
        disabled={disabled}
        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors
          ${isSelected ? "bg-blue/5" : "hover:bg-ink"}
          ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
          ${isSelected ? "bg-blue border-blue" : "border-border"}`}>
          {isLoading
            ? <span className="w-2 h-2 rounded-full bg-blue animate-ping" />
            : isSelected && <span className="text-white text-[10px] font-bold">✓</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text">
            {run.strategy.name}
            <span className="ml-1.5 text-muted font-normal text-xs">{run.strategy.version}</span>
          </div>
          <div className="text-xs text-muted">{run.universe.instrument} · {run.universe.timeframe}</div>
        </div>
        <div className="text-xs font-mono text-right flex-shrink-0">
          <div className={run.kpis.profit_factor >= 1.5 ? "text-green-400" : run.kpis.profit_factor >= 1.2 ? "text-orange" : "text-red-400"}>
            PF {run.kpis.profit_factor.toFixed(2)}
          </div>
          <div className="text-muted">
            DD {run.kpis.max_drawdown_pct.toFixed(1)}% · Z {run.kpis.challenge_z_score}/5
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-text">Comparaison</h1>
          <p className="text-xs text-muted mt-0.5">Sélectionnez 2 à {MAX_SELECT} stratégies à comparer · groupées par section</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: MAX_SELECT }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${i < selected.size ? "bg-blue" : "bg-border"}`}
                  />
                ))}
                <span className="ml-1 text-xs text-muted">{selected.size}/{MAX_SELECT}</span>
              </div>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-muted hover:text-red-400 transition-colors border border-border rounded px-2 py-1"
              >
                Effacer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-muted mr-1">Univers :</span>
        <button
          onClick={() => setInstrument(null)}
          className={`text-xs px-3 py-1.5 rounded border transition-colors ${instrument === null ? "border-blue text-blue bg-blue/5" : "border-border text-muted hover:border-blue/50"}`}
        >
          Tous
        </button>
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst}
            onClick={() => setInstrument(inst === instrument ? null : inst)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${instrument === inst ? "border-blue text-blue bg-blue/5" : "border-border text-muted hover:border-blue/50"}`}
          >
            {inst}
          </button>
        ))}
        {atMax && (
          <span className="ml-auto text-xs text-orange bg-orange/10 border border-orange/20 rounded px-2 py-1">
            Maximum {MAX_SELECT} stratégies atteint
          </span>
        )}
      </div>

      {/* Run selector — grouped by section */}
      {loading ? (
        <div className="bg-surface border border-border rounded-lg h-32 animate-pulse mb-4" />
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-6 text-center text-muted text-sm mb-4">
          Aucun run disponible pour cet univers
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden mb-4">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-xs text-muted uppercase tracking-wider">
              {filtered.length} stratégie{filtered.length > 1 ? "s" : ""} · groupées par section
            </span>
            {loadingAny && (
              <span className="text-xs text-muted flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-blue animate-pulse" />
                Chargement des courbes…
              </span>
            )}
          </div>
          <div className="max-h-[800px] overflow-y-auto">
            {SECTIONS.map((section) => {
              const sectionRuns = filtered.filter((r) =>
                (r.kpis.sections ?? []).includes(section.id)
              );
              if (sectionRuns.length === 0) return null;
              return (
                <div key={section.id}>
                  <div className={`px-4 py-2 text-xs uppercase tracking-wider bg-ink border-b border-border/50 sticky top-0 backdrop-blur ${section.color} font-semibold`}>
                    <span>{section.emoji} {section.label}</span>
                    <span className="ml-2 text-muted font-normal normal-case">({sectionRuns.length})</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {sectionRuns.map(renderRunButton)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty compare state */}
      {selected.size === 0 && !loading && (
        <div className="text-center py-10 text-muted text-sm border border-dashed border-border rounded-lg">
          Sélectionnez au moins 2 stratégies ci-dessus pour voir la comparaison
        </div>
      )}

      {selected.size === 1 && (
        <div className="text-center py-6 text-muted text-xs border border-dashed border-border rounded-lg mb-4">
          Sélectionnez une 2e stratégie pour activer la comparaison
        </div>
      )}

      {/* Charts + table */}
      {selectedDetails.length >= 2 && <OverlayEquity runs={selectedDetails} />}
      {selectedRuns.length >= 2 && <CompareTable runs={selectedRuns} />}
    </div>
  );
}
