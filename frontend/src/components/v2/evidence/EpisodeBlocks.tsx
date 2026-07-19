"use client";
import type { EpisodeSummary, TradeSummary } from "@/lib/evidence/types";
import TradeTable from "./TradeTable";
import EvidenceEmptyState from "./EvidenceEmptyState";

export type EpisodeBlock = { episode: EpisodeSummary; trades: TradeSummary[] };

// Chaque épisode = un bloc ; ses trades sont imbriqués juste dessous, légèrement décalés.
// Le clic se fait DIRECTEMENT sur un trade (ouvre le dossier). Plus de page d'épisode intermédiaire obligatoire.
export default function EpisodeBlocks({ strategyKey, blocks }: { strategyKey: string; blocks: EpisodeBlock[] }) {
  if (!blocks || blocks.length === 0) return <EvidenceEmptyState message="Aucun épisode publié" />;
  return (
    <div className="space-y-3">
      {blocks.map(({ episode, trades }) => {
        const n = trades.length;
        // Nombre RÉEL de trades dans le titre : « 0 trade » / « 1 trade » / « N trades ».
        const title = `${episode.label ?? episode.id} · ${n} trade${n > 1 ? "s" : ""}`;
        return (
          <div key={episode.id} className="border border-border rounded-lg p-4">
            <div className="text-sm font-medium text-text mb-2">{title}</div>
            <div className="pl-3 border-l-2 border-border">
              <TradeTable strategyKey={strategyKey} episodeId={episode.id} rows={trades} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
