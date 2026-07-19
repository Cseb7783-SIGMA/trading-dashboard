"use client";
import { useState } from "react";
import type { EvidenceSummary } from "@/lib/evidence/types";
import { visibleRows, hasMore } from "@/lib/evidence/selectors";
import EvidenceTableRow from "./EvidenceTableRow";
import EvidenceEmptyState from "./EvidenceEmptyState";
import ExpandCollapseButton from "./ExpandCollapseButton";

// Seul composant qui a besoin d'un état client (Voir tout / Réduire).
export default function EvidenceTable({ rows }: { rows: EvidenceSummary[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!rows || rows.length === 0) return <EvidenceEmptyState />;
  const shown = visibleRows<EvidenceSummary>(rows, expanded);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-muted text-xs">
              <th className="text-left font-medium py-1.5 pr-3">Actif</th>
              <th className="text-left font-medium py-1.5 px-2">Timeframe</th>
              <th className="text-left font-medium py-1.5 px-2">Configuration</th>
              <th className="text-right font-medium py-1.5 px-2">Épisodes publiés</th>
              <th className="text-right font-medium py-1.5 px-2">Trades publiés</th>
              <th className="text-left font-medium py-1.5 px-2">Dernière mise à jour</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((it) => <EvidenceTableRow key={it.id} item={it} />)}
          </tbody>
        </table>
      </div>
      {hasMore(rows) && (
        <ExpandCollapseButton expanded={expanded} onToggle={() => setExpanded((v) => !v)} totalCount={rows.length} />
      )}
    </div>
  );
}
