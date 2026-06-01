"use client";
import { useState } from "react";
import type { Run } from "@/lib/types";

type Props = { runs: Run[] };
type StyleTab = "swing" | "scalping";
type PeriodKey = "all_time" | "12m" | "6m" | "3m" | "1m" | "1w" | "1d";

const PERIODS_SWING: { key: PeriodKey; label: string }[] = [
  { key: "all_time", label: "All-time" },
  { key: "12m",      label: "12 mois" },
  { key: "6m",       label: "6 mois"  },
  { key: "3m",       label: "3 mois"  },
  { key: "1m",       label: "1 mois"  },
];

const PERIODS_SCALPING: { key: PeriodKey; label: string }[] = [
  { key: "all_time", label: "All-time"   },
  { key: "3m",       label: "3 mois"     },
  { key: "1m",       label: "1 mois"     },
  { key: "1w",       label: "1 semaine"  },
  { key: "1d",       label: "1 jour"     },
];

export default function MultiPeriodSummary({ runs }: Props) {
  const [styleTab, setStyleTab] = useState<StyleTab>("swing");
  const [filterVerdict, setFilterVerdict] = useState<"all" | "improving" | "stable" | "warning" | "critical" | "insufficient">("all");

  // Base : tier ≥ MEDIUM avec kpis_by_period
  const allEligible = runs.filter(r =>
    r.kpis_by_period && r.d033 && ["STATISTICALLY_ROBUST", "HIGH", "MEDIUM"].includes(r.d033.tier_davey)
  );

  // Filtre par style (auto-classification via d033.style)
  const styleRuns = allEligible.filter(r => (r.d033?.style ?? "swing") === styleTab);

  const topRuns = styleRuns
    .sort((a, b) => {
      const order = { STATISTICALLY_ROBUST: 0, HIGH: 1, MEDIUM: 2, LOW: 3, Archive: 4 };
      const ta = order[a.d033!.tier_davey as keyof typeof order] ?? 4;
      const tb = order[b.d033!.tier_davey as keyof typeof order] ?? 4;
      if (ta !== tb) return ta - tb;
      return b.kpis.profit_factor - a.kpis.profit_factor;
    })
    .slice(0, 30);

  function verdictKey(run: Run): "improving" | "stable" | "warning" | "critical" | "insufficient" {
    const status = run.drift_status ?? "n/a";
    if (status === "stable") {
      const all = run.kpis_by_period?.all_time?.pf ?? 0;
      const recent = run.kpis_by_period?.["3m"]?.pf ?? 0;
      if (recent > all * 1.15) return "improving";
      return "stable";
    }
    if (status === "warning") return "warning";
    if (status === "critical") return "critical";
    return "insufficient";
  }

  const filteredRuns = filterVerdict === "all" ? topRuns : topRuns.filter(r => verdictKey(r) === filterVerdict);

  function verdict(run: Run): { icon: string; label: string; color: string } {
    const status = run.drift_status ?? "n/a";
    if (status === "stable") {
      const all = run.kpis_by_period?.all_time?.pf ?? 0;
      const recent = run.kpis_by_period?.["3m"]?.pf ?? 0;
      if (recent > all * 1.15) {
        return { icon: "🟢", label: "Amélioration récente", color: "text-green-400 font-medium" };
      }
      return { icon: "🟢", label: "Cohérent + récent solide", color: "text-green-400" };
    }
    if (status === "warning") return { icon: "🟡", label: "Drift attention", color: "text-amber-400" };
    if (status === "critical") return { icon: "🔴", label: "Drift dramatique", color: "text-red-300 font-medium" };
    return { icon: "⚪", label: "Sample insuffisant", color: "text-muted" };
  }

  function fmt(v: number | null | undefined): string {
    if (v === null || v === undefined) return "—";
    if (v >= 100) return "∞";
    return v.toFixed(2);
  }

  const periods = styleTab === "swing" ? PERIODS_SWING : PERIODS_SCALPING;
  const swingCount = allEligible.filter(r => (r.d033?.style ?? "swing") === "swing").length;
  const scalpingCount = allEligible.filter(r => r.d033?.style === "scalping").length;

  if (allEligible.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-baseline gap-3 mb-3">
        <h3 className="text-base font-semibold text-text">📊 Résumé multi-périodes</h3>
        <span className="text-xs text-muted">PF (haut) + WR% (bas) par fenêtre · {filteredRuns.length} / {styleRuns.length} stratégies {styleTab}</span>
      </div>

      {/* Toggle Swing | Scalping */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => { setStyleTab("swing"); setFilterVerdict("all"); }}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
            styleTab === "swing"
              ? "bg-blue/15 text-blue border-blue/40 font-medium"
              : "bg-surface text-muted border-border hover:text-text"
          }`}
        >
          📈 Swing & Position ({swingCount})
        </button>
        <button
          onClick={() => { setStyleTab("scalping"); setFilterVerdict("all"); }}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
            styleTab === "scalping"
              ? "bg-purple-50 text-purple-700 border-purple-300 font-medium"
              : "bg-surface text-muted border-border hover:text-text"
          }`}
        >
          ⚡ Scalping ({scalpingCount})
        </button>
        <span className="text-[10px] text-muted ml-2">
          {styleTab === "swing"
            ? "Fenêtres longues (mois) — trades qui durent jours/semaines"
            : "Fenêtres courtes (jour/semaine/mois) — trades qui durent minutes"}
        </span>
      </div>

      {/* Filtre verdict */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3 text-xs">
        <span className="text-muted uppercase tracking-wider mr-1">Filtre verdict :</span>
        {([
          { key: "all",          label: `Tous (${styleRuns.length})`,                                                          cls: "bg-blue/15 text-blue border-blue/40" },
          { key: "improving",    label: `🟢 Amélioration (${styleRuns.filter(r=>verdictKey(r)==="improving").length})`,    cls: "bg-green-50 text-green-700 border-green-200" },
          { key: "stable",       label: `🟢 Stable (${styleRuns.filter(r=>verdictKey(r)==="stable").length})`,             cls: "bg-green-50 text-green-700 border-green-200" },
          { key: "warning",      label: `🟡 Attention (${styleRuns.filter(r=>verdictKey(r)==="warning").length})`,         cls: "bg-amber-50 text-amber-700 border-amber-200" },
          { key: "critical",     label: `🔴 Drift (${styleRuns.filter(r=>verdictKey(r)==="critical").length})`,             cls: "bg-red-50 text-red-700 border-red-200" },
          { key: "insufficient", label: `⚪ Insuffisant (${styleRuns.filter(r=>verdictKey(r)==="insufficient").length})`,  cls: "bg-surface text-muted border-border" },
        ] as const).map((v) => (
          <button
            key={v.key}
            onClick={() => setFilterVerdict(v.key as typeof filterVerdict)}
            className={`px-2.5 py-1 rounded border transition-colors ${filterVerdict === v.key ? v.cls + " font-medium" : "bg-surface text-muted border-border hover:text-text"}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {styleRuns.length === 0 ? (
        <div className="text-xs text-muted italic text-center py-6">
          Aucune stratégie {styleTab} avec tier ≥ MEDIUM pour le moment.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-2 py-2 font-medium">Stratégie</th>
                {periods.map(p => (
                  <th key={p.key} className="text-right px-3 py-2 font-medium">{p.label}</th>
                ))}
                <th className="text-left px-3 py-2 font-medium">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => {
                const v = verdict(run);
                return (
                  <tr key={run.run_id} className="border-b border-border/50 hover:bg-ink transition-colors">
                    <td className="px-2 py-2.5">
                      <div className="font-medium">{run.strategy.name}</div>
                      <div className="text-[10px] text-muted">{run.universe.instrument} {run.universe.timeframe}</div>
                    </td>
                    {periods.map(p => {
                      const kp = run.kpis_by_period?.[p.key];
                      const pf = kp?.pf;
                      const wr = kp?.wr;
                      return (
                        <td key={p.key} className="px-3 py-2.5 text-right font-mono">
                          <div>{fmt(pf)}</div>
                          <div className="text-[10px] text-muted mt-0.5">
                            {wr !== null && wr !== undefined ? `${wr.toFixed(0)}%` : "—"}
                          </div>
                        </td>
                      );
                    })}
                    <td className={`px-3 py-2.5 text-sm ${v.color}`}>
                      <span className="mr-1.5">{v.icon}</span>{v.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border text-[10px] text-muted">
        Lecture : compare le PF (Profit Factor) sur {periods.length} fenêtres temporelles.
        {styleTab === "swing"
          ? " Cohérence entre All-time et 3 mois = edge robuste."
          : " Cohérence entre All-time et 1 jour/1 semaine = edge robuste pour scalping."}
      </div>
    </div>
  );
}
