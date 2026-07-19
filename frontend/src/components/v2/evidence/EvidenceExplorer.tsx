"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { EvidenceSummary } from "@/lib/evidence/types";
import { CATEGORIES } from "@/lib/evidence/types";
import { groupByCategory } from "@/lib/evidence/selectors";
import { publicEvidenceRepository } from "@/lib/evidence/publicEvidenceRepository";

// Page d'entrée (hub) : 3 cartes cliquables vers les 3 pages de catégorie DISTINCTES.
export default function EvidenceExplorer() {
  const [items, setItems] = useState<EvidenceSummary[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    publicEvidenceRepository.listEvidence().then(setItems).catch(() => setErr(true));
  }, []);

  if (err) return <p className="text-sm text-muted">Preuves indisponibles pour le moment. Aucune donnée reconstruite.</p>;

  const grouped = groupByCategory<EvidenceSummary>(items ?? []);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CATEGORIES.map((c) => {
        const n = grouped[c.key].length;
        return (
          <Link
            key={c.key}
            href={`/v2/resultats-detailles/${c.slug}`}
            className="block bg-surface border border-border rounded-lg p-4 hover:border-blue/40 transition-colors"
          >
            <div className="text-sm font-semibold text-text">{c.title}</div>
            <div className="text-xs text-muted mt-1">
              {items === null ? "…" : n === 0 ? "Aucune preuve publiée" : `${n} configuration(s)`}
            </div>
            <div className="text-[11px] text-blue mt-2">Ouvrir →</div>
          </Link>
        );
      })}
    </div>
  );
}
