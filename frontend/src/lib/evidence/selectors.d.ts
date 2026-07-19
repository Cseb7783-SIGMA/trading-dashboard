export const CATEGORY_KEYS: string[];
export function groupByCategory<T extends { category?: string }>(items: unknown): { robuste: T[]; progression: T[]; exploratoire: T[] };
export function visibleRows<T>(rows: unknown, expanded: boolean): T[];
export function hasMore(rows: unknown): boolean;
export function findById<T extends { id?: string }>(items: unknown, id: unknown): T | null;
