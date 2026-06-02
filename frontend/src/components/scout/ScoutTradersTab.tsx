"use client";
import { useEffect, useState } from "react";
import { Users, TrendingUp, Calendar, Loader2, BookOpen, ExternalLink, FileText } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Trader = {
  id: string;
  name?: string;
  paradigm?: string;
  status?: string;
  last_check?: string;
  notes?: string;
  skip_reason?: string;
  priority_score?: number;
  catalog_doc?: string;
  sources?: { youtube?: string; twitter?: string; book?: string };
  native?: { assets?: string[]; tf?: string[]; session?: string };
};

type WatchlistData = {
  meta: { total: number; by_status: Record<string, number>; last_audit?: string };
  traders: Trader[];
  top_candidates: Trader[];
};

const STATUS_COLORS: Record<string, string> = {
  catalogued: "bg-green-50 text-green-700 border-green-300",
  watching: "bg-blue-50 text-blue-700 border-blue-300",
  investigating: "bg-amber-50 text-amber-700 border-amber-300",
  skip: "bg-gray-50 text-gray-600 border-gray-300",
};

const STATUS_LABELS: Record<string, string> = {
  catalogued: "Catalogué",
  watching: "Watching",
  investigating: "Investigating",
  skip: "Skip",
};

// Helper : liens cliquables vers sources externes du trader
function SourceLinks({ trader, compact = false }: { trader: Trader; compact?: boolean }) {
  const sources = trader.sources || {};
  const yt = sources.youtube;
  const tw = sources.twitter;
  const bk = sources.book;
  const size = compact ? 11 : 13;
  const linkClass = "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors hover:bg-blue/10 hover:border-blue/40";
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {yt && (
        <a
          href={yt}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkClass} bg-red-50 text-red-700 border-red-200`}
          onClick={(e) => e.stopPropagation()}
          title={`Ouvrir YouTube : ${yt}`}
        >
          <span className="text-[12px] leading-none">▶</span>
          {!compact && <span>YouTube</span>}
        </a>
      )}
      {tw && (
        <a
          href={tw.startsWith("@") ? `https://twitter.com/${tw.slice(1)}` : tw}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkClass} bg-sky-50 text-sky-700 border-sky-200`}
          onClick={(e) => e.stopPropagation()}
          title={`Ouvrir Twitter/X : ${tw}`}
        >
          <span className="text-[11px] leading-none font-bold">𝕏</span>
          {!compact && <span>{tw}</span>}
        </a>
      )}
      {bk && (
        <span
          className={`${linkClass} bg-amber-50 text-amber-700 border-amber-200 cursor-help`}
          title={bk}
        >
          <BookOpen size={size} />
          {!compact && <span>Livre</span>}
        </span>
      )}
      {trader.catalog_doc && (
        <span
          className={`${linkClass} bg-green-50 text-green-700 border-green-200 cursor-help`}
          title={`Catalogage local : ${trader.catalog_doc}`}
        >
          <FileText size={size} />
          {!compact && <span>Catalogué</span>}
        </span>
      )}
    </div>
  );
}

export default function ScoutTradersTab() {
  const [data, setData] = useState<WatchlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`${API}/scout/traders/watchlist`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted text-sm">
        <Loader2 size={16} className="animate-spin mr-2" /> Chargement watchlist...
      </div>
    );
  }
  if (error || !data) {
    return <div className="text-red-500 text-sm py-8 text-center">Erreur : {error || "no data"}</div>;
  }

  const filteredTraders =
    statusFilter === "all"
      ? data.traders
      : data.traders.filter((t) => t.status === statusFilter);

  return (
    <div className="space-y-4">
      {/* Bannière explicative */}
      <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-xs">
        <div className="flex items-start gap-2">
          <span className="text-base">💡</span>
          <div>
            <div className="font-semibold text-purple-900">Trader Discovery Pipeline (T-43)</div>
            <div className="text-purple-800 mt-1">
              Surveillance hebdomadaire de {data.meta.total} traders pros (YouTube, Twitter, blogs, books).
              Top 3 candidats présentés chaque lundi matin par le Strategic Director.
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wider">Total surveillés</div>
          <div className="text-lg font-semibold">{data.meta.total}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wider">Catalogués</div>
          <div className="text-lg font-semibold text-green-700">{data.meta.by_status.catalogued || 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wider">Watching</div>
          <div className="text-lg font-semibold text-blue">{data.meta.by_status.watching || 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wider">Skip</div>
          <div className="text-lg font-semibold text-muted">{data.meta.by_status.skip || 0}</div>
        </div>
      </div>

      {/* Top candidates */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-purple-600" />
          <h3 className="text-sm font-semibold">Top 3 candidats à investiguer</h3>
          <span className="text-[10px] text-muted">(priorité décroissante)</span>
        </div>
        <div className="space-y-2">
          {data.top_candidates.length === 0 && (
            <div className="text-xs text-muted text-center py-4">Aucun candidat watching</div>
          )}
          {data.top_candidates.map((t, idx) => (
            <div key={t.id} className="flex items-start gap-3 p-3 rounded border border-border/60 bg-ink/10 hover:bg-ink/20 transition-colors">
              <div className="text-xl font-semibold text-purple-600 mt-0.5 w-6">#{idx + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm">{t.name || t.id}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-300 font-semibold">
                    {t.priority_score}/100
                  </span>
                </div>
                <div className="text-xs text-muted">{t.paradigm}</div>
                {t.notes && (
                  <div className="text-[11px] text-muted/80 mt-1 italic line-clamp-2">{t.notes}</div>
                )}
                <div className="flex items-center justify-between gap-3 mt-1.5">
                  <div className="flex items-center gap-3 text-[10px] text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> {t.last_check || "?"}
                    </span>
                  </div>
                  <SourceLinks trader={t} />
                </div>
                {/* Boutons d'action — placeholder (interactifs prochainement) */}
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40">
                  <button
                    disabled
                    title="Bientôt — pour l'instant dis-moi dans le chat : « on attaque [nom du trader] »"
                    className="flex-1 text-[10px] font-medium px-2 py-1.5 rounded border bg-green-50 text-green-700 border-green-300 opacity-60 cursor-not-allowed hover:opacity-80 transition-opacity"
                  >
                    🟢 Implémenter
                  </button>
                  <button
                    disabled
                    title="Bientôt — pour l'instant dis-moi dans le chat : « investigue plus [nom du trader] »"
                    className="flex-1 text-[10px] font-medium px-2 py-1.5 rounded border bg-amber-50 text-amber-700 border-amber-300 opacity-60 cursor-not-allowed hover:opacity-80 transition-opacity"
                  >
                    🟡 Investiguer
                  </button>
                  <button
                    disabled
                    title="Bientôt — pour l'instant dis-moi dans le chat : « skip [nom du trader], raison: XXX »"
                    className="flex-1 text-[10px] font-medium px-2 py-1.5 rounded border bg-gray-50 text-gray-600 border-gray-300 opacity-60 cursor-not-allowed hover:opacity-80 transition-opacity"
                  >
                    🔴 Skip
                  </button>
                </div>
                <div className="text-[9px] text-muted/60 italic mt-1">
                  Actions interactives bientôt — pour l'instant, demande dans le chat
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Watchlist complète */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={14} />
            <h3 className="text-sm font-semibold">Watchlist complète ({filteredTraders.length})</h3>
          </div>
          <div className="flex gap-1.5 text-[11px]">
            {["all", "watching", "catalogued", "investigating", "skip"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 rounded ${statusFilter === s ? "bg-blue/20 text-blue font-medium" : "bg-surface-hover text-muted hover:bg-border"}`}
              >
                {s === "all" ? "Tous" : STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {filteredTraders.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2 px-2 hover:bg-ink/10 rounded text-xs">
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase ${STATUS_COLORS[t.status || "watching"]}`}>
                {STATUS_LABELS[t.status || "watching"] || t.status}
              </span>
              <span className="font-medium flex-1 truncate">{t.name || t.id}</span>
              <span className="text-muted text-[11px] truncate max-w-[30%]">{t.paradigm}</span>
              <SourceLinks trader={t} compact />
              {t.priority_score !== undefined && t.priority_score > 0 && (
                <span className="text-[10px] text-purple-700 font-mono w-8 text-right">{t.priority_score}</span>
              )}
              <span className="text-[10px] text-muted/60 w-20 text-right">{t.last_check || "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="text-[10px] text-muted text-center">
        Watchlist : <code>docs/scout/trader_watchlist.yaml</code> · Tool :{" "}
        <code>python3 tools/trader_discovery_scan.py</code> · Skill :{" "}
        <code>.claude/skills/trader-discovery-pipeline/SKILL.md</code>
      </div>
    </div>
  );
}
