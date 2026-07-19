// Interface de LECTURE de preuves. Découple la V2 du format futur des fichiers (voir plan §8).
import type { EvidenceSummary, EpisodeSummary, TradeSummary, ScientificTradeRecord } from "./types";

export interface EvidenceRepository {
  listEvidence(): Promise<EvidenceSummary[]>;
  getEvidence(strategyKey: string): Promise<EvidenceSummary | null>;
  listEpisodes(strategyKey: string): Promise<EpisodeSummary[]>;
  getEpisode(strategyKey: string, episodeId: string): Promise<EpisodeSummary | null>;
  listTrades(strategyKey: string, episodeId: string): Promise<TradeSummary[]>;
  getTrade(
    strategyKey: string,
    episodeId: string,
    tradeId: string,
  ): Promise<{ summary: TradeSummary; record: ScientificTradeRecord } | null>;
}
