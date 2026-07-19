// Projection PUBLIQUE filtrée en lecture seule : sigma-reports/evidence/.
// index.json existe (configs classées). strategies/episodes/trades : lus SEULEMENT s'ils existent réellement ;
// absents => collections vides / null (JAMAIS de données fictives, jamais recyclées de la lecture du marché).
import type { EvidenceRepository } from "./repository";
import type { EvidenceSummary, EpisodeSummary, TradeSummary, ScientificTradeRecord } from "./types";

const OWNER = "Cseb7783-SIGMA";
const REPO = "sigma-reports";
const BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/evidence`;

async function getJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

const num = (v: unknown) => (typeof v === "number" ? v : undefined);
const str = (v: unknown) => (v == null ? undefined : String(v));

function toSummary(x: any): EvidenceSummary | null {
  if (!x || typeof x.id !== "string" || typeof x.category !== "string" || typeof x.asset !== "string") return null;
  return {
    id: x.id,
    category: x.category,
    asset: x.asset,
    timeframe: String(x.timeframe ?? ""),
    configuration: String(x.configuration ?? ""),
    episodeCount: num(x.episodeCount),   // absent => Non publié (jamais 0)
    tradeCount: num(x.tradeCount),
    updatedAt: str(x.updatedAt),
  };
}

async function loadIndex(): Promise<EvidenceSummary[]> {
  const j = await getJson(`${BASE}/index.json`);
  const arr = Array.isArray(j?.evidence) ? j.evidence : [];
  return arr.map(toSummary).filter((x: EvidenceSummary | null): x is EvidenceSummary => x !== null);
}

async function loadEpisodes(strategyKey: string): Promise<EpisodeSummary[]> {
  const j = await getJson(`${BASE}/strategies/${encodeURIComponent(strategyKey)}.json`);
  const arr = Array.isArray(j?.episodes) ? j.episodes : [];
  return arr.filter((e: any) => e && typeof e.id === "string");
}

async function loadTrades(episodeId: string): Promise<TradeSummary[]> {
  const j = await getJson(`${BASE}/episodes/${encodeURIComponent(episodeId)}.json`);
  const arr = Array.isArray(j?.trades) ? j.trades : [];
  return arr.filter((t: any) => t && typeof t.id === "string");
}

export const publicEvidenceRepository: EvidenceRepository = {
  async listEvidence() {
    return loadIndex();
  },
  async getEvidence(strategyKey) {
    return (await loadIndex()).find((e) => e.id === strategyKey) ?? null;
  },
  async listEpisodes(strategyKey) {
    return loadEpisodes(strategyKey);
  },
  async getEpisode(strategyKey, episodeId) {
    return (await loadEpisodes(strategyKey)).find((e) => e.id === episodeId) ?? null;
  },
  async listTrades(_strategyKey, episodeId) {
    return loadTrades(episodeId);
  },
  async getTrade(_strategyKey, _episodeId, tradeId) {
    const j = await getJson(`${BASE}/trades/${encodeURIComponent(tradeId)}.json`);
    if (!j || typeof j.id !== "string") return null;
    const summary: TradeSummary = { id: j.id, episodeId: String(j.episodeId ?? "") };
    const record: ScientificTradeRecord = (j.record && typeof j.record === "object") ? j.record : {};
    return { summary, record };
  },
};
