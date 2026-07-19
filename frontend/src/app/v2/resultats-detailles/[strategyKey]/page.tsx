"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { EvidenceSummary } from "@/lib/evidence/types";
import { publicEvidenceRepository } from "@/lib/evidence/publicEvidenceRepository";
import EvidenceBreadcrumbs from "@/components/v2/evidence/EvidenceBreadcrumbs";
import EpisodeBlocks, { type EpisodeBlock } from "@/components/v2/evidence/EpisodeBlocks";

export default function StrategyEpisodesPage() {
  const params = useParams<{ strategyKey: string }>();
  const strategyKey = decodeURIComponent(params.strategyKey);
  const [loading, setLoading] = useState(true);
  const [ev, setEv] = useState<EvidenceSummary | null>(null);
  const [blocks, setBlocks] = useState<EpisodeBlock[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      // Charge config + épisodes + trades de chaque épisode ENSEMBLE (pas de flash, trades imbriqués directement).
      const [e, eps] = await Promise.all([
        publicEvidenceRepository.getEvidence(strategyKey),
        publicEvidenceRepository.listEpisodes(strategyKey),
      ]);
      const tradeLists = await Promise.all(eps.map((ep) => publicEvidenceRepository.listTrades(strategyKey, ep.id)));
      if (!alive) return;
      setEv(e);
      setBlocks(eps.map((episode, i) => ({ episode, trades: tradeLists[i] })));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [strategyKey]);

  // Titre HUMAIN (jamais l'id opaque, qui reste dans l'URL / relations techniques).
  const humanTitle = ev ? `${ev.asset} · ${ev.timeframe} · ${ev.configuration}` : "Configuration";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <EvidenceBreadcrumbs items={[
        { label: "Résultats détaillés", href: "/v2/resultats-detailles" },
        { label: humanTitle },
      ]} />

      <div>
        <h1 className="text-lg font-semibold text-text">{humanTitle}</h1>
        <p className="text-xs text-muted mt-1">Épisodes et leurs trades. Cliquez un trade pour son dossier scientifique. Observation seulement, non validé.</p>
      </div>

      {loading ? (
        <section className="bg-surface border border-border rounded-lg p-5"><p className="text-sm text-muted">Chargement…</p></section>
      ) : ev === null ? (
        <section className="bg-surface border border-border rounded-lg p-5">
          <p className="text-sm text-text">Dossier introuvable.</p>
          <p className="text-sm text-muted mt-1">Aucune configuration publiée sous cet identifiant. Aucune donnée reconstruite.</p>
        </section>
      ) : (
        <section className="bg-surface border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-text mb-3">Épisodes</h2>
          <EpisodeBlocks strategyKey={strategyKey} blocks={blocks} />
        </section>
      )}
    </div>
  );
}
