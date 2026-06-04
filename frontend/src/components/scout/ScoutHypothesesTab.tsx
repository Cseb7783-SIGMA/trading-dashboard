"use client";

import { useEffect, useState } from "react";
import { Lightbulb, RefreshCw, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Hypothesis = {
  id: string;
  type: "combo_cross_paradigm" | "winner_extension";
  components: string[];
  asset_tf: string;
  paradigms?: string[];
  from_winner?: string;
  novelty: number;
  promising: number;
  effort_h: number;
  score: number;
  rationale: string;
};

type ApiResponse = {
  meta: {
    generated_at: string | null;
    total: number;
    source_file: string | null;
    error?: string;
  };
  hypotheses: Hypothesis[];
};

type SortKey = "score" | "novelty" | "promising" | "effort_h";

export default function ScoutHypothesesTab() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "combo_cross_paradigm" | "winner_extension">("all");
  const [minScore, setMinScore] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDesc, setSortDesc] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadHypotheses() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type_filter", typeFilter);
      params.set("min_score", String(minScore));
      params.set("limit", "200");
      const res = await fetch(`${API}/scout/hypotheses?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHypotheses();
  }, [typeFilter, minScore]);

  const handleSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(k);
      setSortDesc(true);
    }
  };

  const sorted = data
    ? [...data.hypotheses].sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        return sortDesc ? (vb as number) - (va as number) : (va as number) - (vb as number);
      })
    : [];

  const copyTemplate = (h: Hypothesis) => {
    const comps = h.components.join(" + ");
    const template = `# Hypothesis ${h.id} — ${comps} on ${h.asset_tf}
# Score: ${h.score} (novelty ${h.novelty}/10, promising ${h.promising}, effort ${h.effort_h}h)
# Rationale: ${h.rationale}

# 1. Implement strategy combining: ${comps}
# 2. Backtest on ${h.asset_tf}
# 3. Walk-forward T-21 yearly (4 segments)
# 4. If WF PASS → ingest run + Agent Retro T-32
`;
    navigator.clipboard.writeText(template);
    setCopiedId(h.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-600" />
            <h2 className="text-sm font-medium">Hypothèses combinatoires</h2>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300 font-semibold">
              T-50
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Générées par <code className="text-[10px] bg-surface px-1 py-0.5 rounded">hypothesis_generator.py</code> —
            combinaisons composants × asset/TF non encore explorées.
          </p>
          {data?.meta.generated_at && (
            <p className="text-[11px] text-muted mt-1">
              Dernière génération : {new Date(data.meta.generated_at).toLocaleString("fr-CA")} · Source :{" "}
              <code className="text-[10px]">{data.meta.source_file}</code>
            </p>
          )}
        </div>
        <button
          onClick={loadHypotheses}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs border border-border rounded hover:bg-surface transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Regénérer
        </button>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted">Type :</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="px-2 py-1 border border-border rounded bg-surface text-xs"
          >
            <option value="all">Tous</option>
            <option value="combo_cross_paradigm">Cross-paradigme</option>
            <option value="winner_extension">Extension winner</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted">Score min :</span>
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value) || 0)}
            className="w-16 px-2 py-1 border border-border rounded bg-surface text-xs"
            min={-10}
            max={20}
          />
        </div>
        <div className="text-muted">
          {data?.meta.total ?? 0} hypothèses · {sorted.length} affichées
        </div>
      </div>

      {/* Table */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700">
          Erreur : {error}
        </div>
      )}

      {loading && !data && <p className="text-xs text-muted">Chargement…</p>}

      {data?.meta.error && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-700">
          {data.meta.error}
        </div>
      )}

      {!loading && sorted.length === 0 && !error && !data?.meta.error && (
        <p className="text-xs text-muted">Aucune hypothèse avec ces filtres.</p>
      )}

      {sorted.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-bg border-b border-border text-left text-[10px] uppercase text-muted">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Composants</th>
                <th className="px-3 py-2 font-medium">Asset/TF</th>
                <SortableTh label="Novelty" k="novelty" sortKey={sortKey} sortDesc={sortDesc} onClick={handleSort} />
                <SortableTh label="Promising" k="promising" sortKey={sortKey} sortDesc={sortDesc} onClick={handleSort} />
                <SortableTh label="Effort" k="effort_h" sortKey={sortKey} sortDesc={sortDesc} onClick={handleSort} />
                <SortableTh label="Score" k="score" sortKey={sortKey} sortDesc={sortDesc} onClick={handleSort} />
                <th className="px-3 py-2 font-medium">Rationale</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((h, idx) => (
                <tr key={h.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                  <td className="px-3 py-2 text-muted">{idx + 1}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{h.id}</td>
                  <td className="px-3 py-2">
                    {h.type === "combo_cross_paradigm" ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Cross
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Ext
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-[280px]">
                    <div className="text-text">{h.components.join(" + ")}</div>
                    {h.paradigms && (
                      <div className="text-[10px] text-muted mt-0.5">
                        {h.paradigms.join(" × ")}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono">{h.asset_tf}</td>
                  <td className="px-3 py-2 text-center">{h.novelty}/10</td>
                  <td className="px-3 py-2 text-center">{h.promising}</td>
                  <td className="px-3 py-2 text-center">{h.effort_h}h</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className="font-medium"
                      style={{ color: h.score >= 9 ? "#16a34a" : h.score >= 6 ? "#f59e0b" : "#6b7280" }}
                    >
                      {h.score}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted max-w-[300px]">{h.rationale}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => copyTemplate(h)}
                      title="Copier template d'implémentation"
                      className="flex items-center gap-1 text-[10px] px-2 py-1 border border-border rounded hover:bg-bg transition-colors"
                    >
                      {copiedId === h.id ? (
                        <>
                          <Check size={10} className="text-emerald-600" /> Copié
                        </>
                      ) : (
                        <>
                          <Copy size={10} /> Template
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Légende */}
      <div className="bg-surface border border-border rounded p-3 text-[11px] text-muted">
        <div className="font-medium text-text mb-1">Lecture du scoring</div>
        <ul className="space-y-0.5 ml-3 list-disc">
          <li>
            <strong>Novelty</strong> : 10 = aucun composant testé sur cet asset_tf · 6 = un seul nouveau · &lt;6 = déjà couvert
          </li>
          <li>
            <strong>Promising</strong> : proximité avec un winner connu (asset_tf + composants overlap)
          </li>
          <li>
            <strong>Effort</strong> : 2h si data dispo, 6h si fetch nécessaire
          </li>
          <li>
            <strong>Score</strong> = Novelty + Promising − Effort
          </li>
        </ul>
        <div className="mt-2">
          Workflow recommandé : Sebast pick 1-3 hypothèses · Researcher (D-029) implémente + backtest + WF · Si WF PASS →
          ingest run + Agent Retro T-32.
        </div>
      </div>
    </div>
  );
}

function SortableTh({
  label,
  k,
  sortKey,
  sortDesc,
  onClick,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDesc: boolean;
  onClick: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <th
      onClick={() => onClick(k)}
      className={`px-3 py-2 font-medium cursor-pointer select-none hover:text-text ${active ? "text-text" : ""}`}
    >
      <div className="inline-flex items-center gap-1">
        {label}
        {active && (sortDesc ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}
      </div>
    </th>
  );
}
