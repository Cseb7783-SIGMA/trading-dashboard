"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { EpisodeSummary, TradeSummary } from "@/lib/evidence/types";
import { publicEvidenceRepository } from "@/lib/evidence/publicEvidenceRepository";
import EvidenceBreadcrumbs from "@/components/v2/evidence/EvidenceBreadcrumbs";
import TradeTable from "@/components/v2/evidence/TradeTable";

export default function EpisodeTradesPage() {
  const params = useParams<{ strategyKey: string; episodeId: string }>();
  const strategyKey = decodeURIComponent(params.strategyKey);
  const episodeId = decodeURIComponent(params.episodeId);
  const [loading, setLoading] = useState(true);
  const [ep, setEp] = useState<EpisodeSummary | null>(null);
  const [trades, setTrades] = useState<TradeSummary[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [e, list] = await Promise.all([
        publicEvidenceRepository.getEpisode(strategyKey, episodeId),
        publicEvidenceRepository.listTrades(strategyKey, episodeId),
      ]);
      if (!alive) return;
      setEp(e); setTrades(list); setLoading(false);
    })();
    return () => { alive = false; };
  }, [strategyKey, episodeId]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <EvidenceBreadcrumbs items={[
        { label: "Résultats détaillés", href: "/v2/resultats-detailles" },
        { label: strategyKey, href: `/v2/resultats-detailles/${encodeURIComponent(strategyKey)}` },
        { label: `Épisode ${episodeId}` },
      ]} />

      <div>
        <h1 className="text-lg font-semibold text-text">Épisode {episodeId}</h1>
        <p className="text-xs text-muted mt-1">Trades publiés pour cet épisode. Observation seulement, non validé.</p>
      </div>

      {loading ? (
        <section className="bg-surface border border-border rounded-lg p-5"><p className="text-sm text-muted">Chargement…</p></section>
      ) : ep === null ? (
        <section className="bg-surface border border-border rounded-lg p-5">
          <p className="text-sm text-text">Épisode introuvable.</p>
          <p className="text-sm text-muted mt-1">Aucun épisode publié sous cet identifiant. Aucune donnée reconstruite.</p>
        </section>
      ) : (
        <section className="bg-surface border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-text mb-2">Trades</h2>
          <TradeTable strategyKey={strategyKey} episodeId={episodeId} rows={trades} />
        </section>
      )}
    </div>
  );
}
