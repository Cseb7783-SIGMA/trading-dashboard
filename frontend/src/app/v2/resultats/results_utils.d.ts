export function countReports(names: unknown): number;
export function reportSpan(names: unknown): { from: string; to: string } | null;
export type Observation = {
  assetsTracked: number | null;
  assetsTotal: number | null;
  configsOn: number | null;
  configsOff: number | null;
  lowVolEpisodes: number | null;
  bilan: string | null;
};
export function parseObservation(md: unknown): Observation | null;
export function parseInsufficient(md: unknown): string[];
