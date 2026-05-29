import type { Run } from "@/lib/types";

export default function KPISummary({ runs }: { runs: Run[] }) {
  if (!runs.length) return null;

  // Sample multiplier Phase 1 : on filtre sur ≥ 50 trades pour métriques robustes
  const robust = runs.filter((r) => r.kpis.total_trades >= 50);

  const bestPFRobust = robust.length > 0
    ? Math.max(...robust.map((r) => r.kpis.profit_factor))
    : 0;

  const bestZRobust = robust.length > 0
    ? Math.max(...robust.map((r) => r.kpis.challenge_z_score))
    : 0;

  // Strats avancées = dans PropFirm OU Challenge Z (peuvent être dans les 2)
  const propfirmCount = runs.filter((r) =>
    (r.kpis.sections ?? []).includes("propfirm")
  ).length;
  const challengeZCount = runs.filter((r) =>
    (r.kpis.sections ?? []).includes("challenge_z")
  ).length;

  const cards = [
    {
      label: "Runs analysés",
      value: runs.length.toString(),
      sub: "depuis S26",
    },
    {
      label: "Best PF (sample ≥ 50 trades)",
      value: bestPFRobust > 0 ? bestPFRobust.toFixed(2) : "—",
      sub: robust.length > 0 ? `parmi ${robust.length} robustes` : "aucun ≥ 50 trades",
    },
    {
      label: "Best Z Score (sample ≥ 50)",
      value: bestZRobust > 0 ? `${bestZRobust}/5` : "—",
      sub: "compatibilité Challenge Z TMAFX",
    },
    {
      label: "Stratégies avancées",
      value: `${propfirmCount + challengeZCount}`,
      sub: `${propfirmCount} PropFirm · ${challengeZCount} Challenge Z`,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {cards.map(({ label, value, sub }) => (
        <div key={label} className="bg-surface border border-border rounded-lg px-5 py-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">{label}</div>
          <div className="text-2xl font-semibold text-text">{value}</div>
          <div className="text-[11px] text-muted mt-1">{sub}</div>
        </div>
      ))}
    </div>
  );
}
