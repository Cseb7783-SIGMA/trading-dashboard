"use client";
import Link from "next/link";
import { Microscope, Target } from "lucide-react";
import EvidenceBreadcrumbs from "@/components/v2/evidence/EvidenceBreadcrumbs";
import EvidenceExplorer from "@/components/v2/evidence/EvidenceExplorer";

// V2 — Résultats détaillés (explorateur de preuves). Zone INDEPENDANTE, LECTURE SEULE.
// Aucune donnée fictive : tant qu'aucune preuve n'est publiée, les 3 tableaux affichent « Aucune preuve publiée ».
export default function ResultatsDetaillesPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue/20 text-blue uppercase">V2 · Prototype</span>
          <Microscope size={16} className="text-blue" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-text">Résultats détaillés</h1>
        <p className="text-xs text-muted mt-1">
          Observation seulement, pas un conseil. Explorateur des preuves publiées : stratégies classées, épisodes, trades, dossier scientifique.
          La catégorie vient de la preuve publiée, jamais d'un calcul de l'interface. Rien n'est reconstruit ni inventé.
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
        <Link href="/v2/resultats" className="flex items-center gap-1 text-blue hover:underline"><Target size={12} aria-hidden="true" /> Résultats / Forward (état général)</Link>
      </div>

      <EvidenceBreadcrumbs items={[{ label: "Résultats détaillés" }]} />
      <p className="text-xs text-muted">Choisir une section :</p>
      <EvidenceExplorer />

      <p className="text-[10px] text-muted/60">
        Source : projection publique filtrée (à venir). Statut : observation exploratoire, jamais confirmée. Aucune performance affichée tant qu'aucune preuve validée n'est publiée.
      </p>
    </div>
  );
}
