"use client";
import { useEffect, useState } from "react";
import type { EvidenceSummary, EvidenceCategory } from "@/lib/evidence/types";
import { groupByCategory } from "@/lib/evidence/selectors";
import { publicEvidenceRepository } from "@/lib/evidence/publicEvidenceRepository";
import EvidenceBreadcrumbs from "./EvidenceBreadcrumbs";
import EvidenceTable from "./EvidenceTable";

// Page de catégorie DISTINCTE : son propre tableau (mêmes colonnes + Voir tout / Réduire).
export default function EvidenceCategoryView({
  categoryKey, title,
}: { categoryKey: EvidenceCategory; title: string }) {
  const [items, setItems] = useState<EvidenceSummary[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    publicEvidenceRepository.listEvidence().then(setItems).catch(() => setErr(true));
  }, []);

  const rows = groupByCategory<EvidenceSummary>(items ?? [])[categoryKey];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <EvidenceBreadcrumbs items={[
        { label: "Résultats détaillés", href: "/v2/resultats-detailles" },
        { label: title },
      ]} />

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue/20 text-blue uppercase">V2 · Prototype</span>
        </div>
        <h1 className="text-lg font-semibold text-text">{title}</h1>
        <p className="text-xs text-muted mt-1">
          Observation seulement, pas un conseil. Configurations classées selon la preuve publiée, jamais un calcul de l'interface.
        </p>
      </div>

      <section className="bg-surface border border-border rounded-lg p-5">
        {err
          ? <p className="text-sm text-muted">Preuves indisponibles pour le moment. Aucune donnée reconstruite.</p>
          : <EvidenceTable rows={rows} />}
      </section>
    </div>
  );
}
