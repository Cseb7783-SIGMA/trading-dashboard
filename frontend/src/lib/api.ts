import type { Run, RunDetail } from "./types";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export async function fetchRuns(): Promise<Run[]> {
  const res = await fetch(`${BASE}/runs`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchRuns: ${res.status}`);
  return res.json();
}

export async function fetchRun(runId: string): Promise<RunDetail> {
  const res = await fetch(`${BASE}/runs/${encodeURIComponent(runId)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchRun: ${res.status}`);
  return res.json();
}

export function getStreamUrl(): string {
  return `${BASE}/stream`;
}

export function getAiStreamUrl(): string {
  return `${BASE}/ai`;
}

export async function postAiPrompt(runId: string, prompt: string): Promise<Response> {
  return fetch(`${BASE}/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run_id: runId, prompt }),
  });
}

export interface Suggestion {
  id: string;
  run_id: string;
  saved_at: string;
  prompt: string;
  response: string;
  template?: string;
}

export async function fetchSuggestions(runId: string): Promise<Suggestion[]> {
  const res = await fetch(`${BASE}/runs/${encodeURIComponent(runId)}/suggestions`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function saveSuggestion(runId: string, prompt: string, response: string, template?: string): Promise<void> {
  await fetch(`${BASE}/runs/${encodeURIComponent(runId)}/suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, response, template }),
  });
}

export async function deleteSuggestion(runId: string, suggestionId: string): Promise<void> {
  await fetch(`${BASE}/runs/${encodeURIComponent(runId)}/suggestions/${suggestionId}`, {
    method: "DELETE",
  });
}
