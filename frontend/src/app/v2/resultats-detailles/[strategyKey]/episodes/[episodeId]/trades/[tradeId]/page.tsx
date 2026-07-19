"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { TradeSummary, ScientificTradeRecord as Rec } from "@/lib/evidence/types";
import { publicEvidenceRepository } from "@/lib/evidence/publicEvidenceRepository";
import EvidenceBreadcrumbs from "@/components/v2/evidence/EvidenceBreadcrumbs";
import ScientificTradeRecord from "@/components/v2/evidence/ScientificTradeRecord";

export default function TradeRecordPage() {
  const params = useParams<{ strategyKey: string; episodeId: string; tradeId: string }>();
  const strategyKey = decodeURIComponent(params.strategyKey);
  const episodeId = decodeURIComponent(params.episodeId);
  const tradeId = decodeURIComponent(params.tradeId);
  const [data, setData] = useState<{ summary: TradeSummary; record: Rec } | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      setData(await publicEvidenceRepository.getTrade(strategyKey, episodeId, tradeId));
    })();
  }, [strategyKey, episodeId, tradeId]);

  const epHref = `/v2/resultats-detailles/${encodeURIComponent(strategyKey)}/episodes/${encodeURIComponent(episodeId)}`;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <EvidenceBreadcrumbs items={[
        { label: "Résultats détaillés", href: "/v2/resultats-detailles" },
        { label: strategyKey, href: `/v2/resultats-detailles/${encodeURIComponent(strategyKey)}` },
        { label: `Épisode ${episodeId}`, href: epHref },
        { label: `Trade ${tradeId}` },
      ]} />

      <div>
        <h1 className="text-lg font-semibold text-text">Dossier scientifique — Trade {tradeId}</h1>
        <p className="text-xs text-muted mt-1">Observation seulement, pas un conseil. Champs non publiés affichés « Non publié ».</p>
      </div>

      {data === undefined ? (
        <section className="bg-surface border border-border rounded-lg p-5"><p className="text-sm text-muted">Chargement…</p></section>
      ) : data === null ? (
        <section className="bg-surface border border-border rounded-lg p-5">
          <p className="text-sm text-text">Trade introuvable.</p>
          <p className="text-sm text-muted mt-1">Aucun dossier publié sous cet identifiant. Aucune donnée reconstruite.</p>
        </section>
      ) : (
        <section className="bg-surface border border-border rounded-lg p-5">
          <ScientificTradeRecord record={data.record} />
        </section>
      )}
    </div>
  );
}
