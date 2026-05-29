"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { fetchRuns, postAiPrompt, fetchSuggestions, saveSuggestion, deleteSuggestion } from "@/lib/api";
import type { Run } from "@/lib/types";
import type { Suggestion } from "@/lib/api";
import PromptPanel from "@/components/ai/PromptPanel";
import ResponseStream from "@/components/ai/ResponseStream";
import SuggestionsList from "@/components/ai/SuggestionsList";

type Tab = "analyse" | "suggestions";

export default function AIPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [currentTemplate, setCurrentTemplate] = useState("");
  const [runsLoading, setRunsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("analyse");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchRuns()
      .then((data) => {
        setRuns(data);
        if (data.length > 0) setSelectedRun(data[0]);
      })
      .finally(() => setRunsLoading(false));
  }, []);

  const loadSuggestions = useCallback(async (runId: string) => {
    setSuggestionsLoading(true);
    try {
      const data = await fetchSuggestions(runId);
      setSuggestions(data);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRun) {
      loadSuggestions(selectedRun.run_id);
      setResponse("");
      setCurrentPrompt("");
    }
  }, [selectedRun, loadSuggestions]);

  useEffect(() => {
    if (tab === "suggestions" && selectedRun) {
      loadSuggestions(selectedRun.run_id);
    }
  }, [tab, selectedRun, loadSuggestions]);

  const handleSubmit = async (prompt: string, template: string) => {
    if (!selectedRun || !prompt.trim()) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setResponse("");
    setCurrentPrompt(prompt);
    setCurrentTemplate(template);

    try {
      const res = await postAiPrompt(selectedRun.run_id, prompt);
      if (!res.ok) throw new Error(`Erreur API: ${res.status}`);
      if (!res.body) throw new Error("Pas de body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) { full += parsed.text; setResponse(full); }
            } catch {
              if (data && data !== "[DONE]") { full += data; setResponse(full); }
            }
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setResponse(`Erreur : ${e.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedRun || !response || !currentPrompt) return;
    await saveSuggestion(selectedRun.run_id, currentPrompt, response, currentTemplate || undefined);
    await loadSuggestions(selectedRun.run_id);
  };

  const handleDelete = async (id: string) => {
    if (!selectedRun) return;
    await deleteSuggestion(selectedRun.run_id, id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  if (runsLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-surface border border-border rounded animate-pulse" />
        <div className="bg-surface border border-border rounded-lg h-48 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text">Assistant IA</h1>
        <p className="text-xs text-muted mt-0.5">
          Claude analyse vos stratégies et propose des améliorations concrètes
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3 text-muted">
          <p className="text-sm">Aucun run disponible</p>
          <p className="text-xs">Lancez un backtest pour commencer l'analyse.</p>
        </div>
      ) : (
        <>
          {/* Run selector */}
          <div className="mb-5">
            <label className="block text-xs text-muted mb-1.5">Stratégie à analyser</label>
            <select
              value={selectedRun?.run_id ?? ""}
              onChange={(e) => {
                const run = runs.find((r) => r.run_id === e.target.value);
                if (run) setSelectedRun(run);
              }}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-blue transition-colors"
            >
              {runs.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.strategy.name} {r.strategy.version} · {r.universe.instrument} · PF {r.kpis.profit_factor.toFixed(2)} · DD {r.kpis.max_drawdown_pct.toFixed(1)}%
                </option>
              ))}
            </select>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border mb-5">
            {(["analyse", "suggestions"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? "border-blue text-blue"
                    : "border-transparent text-muted hover:text-text"
                }`}
              >
                {t === "analyse" ? "Analyse" : (
                  <span className="flex items-center gap-1.5">
                    Suggestions sauvegardées
                    {suggestions.length > 0 && (
                      <span className="text-[10px] bg-blue/20 text-blue rounded-full px-1.5 py-0.5 font-semibold">
                        {suggestions.length}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === "analyse" && selectedRun && (
            <>
              <PromptPanel run={selectedRun} onSubmit={handleSubmit} loading={loading} />
              <ResponseStream
                text={response}
                loading={loading}
                onSave={response && !loading ? handleSave : undefined}
              />
              {loading && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => { abortRef.current?.abort(); setLoading(false); }}
                    className="text-xs px-3 py-1.5 rounded border border-border text-muted hover:text-red-400 hover:border-red-400/40 transition-colors"
                  >
                    Annuler la génération
                  </button>
                </div>
              )}
            </>
          )}

          {tab === "suggestions" && (
            suggestionsLoading
              ? <div className="bg-surface border border-border rounded-lg h-32 animate-pulse" />
              : <SuggestionsList suggestions={suggestions} onDelete={handleDelete} />
          )}
        </>
      )}
    </div>
  );
}
