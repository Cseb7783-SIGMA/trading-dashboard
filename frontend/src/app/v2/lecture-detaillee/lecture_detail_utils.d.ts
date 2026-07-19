export type RegimeBucket = { label: string; count: number };
export type RegimeDistribution = { buckets: RegimeBucket[]; total: number };
export function parseRegimeDistribution(md: unknown): RegimeDistribution | null;
export type Volatility = { level: string; count: number; total: number };
export function parseVolatility(md: unknown): Volatility | null;
export type TrackedAssets = { tracked: number; total: number };
export function parseTrackedAssets(md: unknown): TrackedAssets | null;
export type Consensus = { dominant: string; count: number; total: number; share: number; aligned: boolean };
export function regimeConsensus(distribution: unknown): Consensus | null;
export type AssetRow = {
  actif: string;
  timeframe: string | null;
  direction: string | null;
  regime: string | null;
  volatility: string | null;
};
export function parsePerAsset(md: unknown): AssetRow[];
