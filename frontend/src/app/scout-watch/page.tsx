"use client";
import { useEffect, useState } from "react";
import { Eye, RefreshCw, Plus, Sparkles, Flag, Clock, X, ExternalLink, Inbox, Users, FileText, Lightbulb } from "lucide-react";
import ScoutTradersTab from "@/components/scout/ScoutTradersTab";
import ScoutHypothesesTab from "@/components/scout/ScoutHypothesesTab";
import ScoutBriefsTab from "@/components/scout/ScoutBriefsTab";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Source = {
  name: string;
  handle_url: string;
  channel_id: string | null;
  weight: string;
  paradigms: string[];
  active: boolean;
  last_check: string | null;
  notes?: string;
};

type InboxItem = {
  filename: string;
  title: string;
  source: string;
  url: string;
  published: string;
  weight: string;
  paradigms: string[];
  status: string;
  score: number | null;
  size_bytes: number;
};

export default function ScoutWatchPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"content"|"traders"|"briefs"|"hypotheses">("content");
  const [filter, setFilter] = useState<string>("pending");
  const [refreshing, setRefreshing] = useState(false);
  // S62 — Vue groupée par source
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [collapsedSources, setCollapsedSources] = useState<Set<string>>(new Set());
  const toggleSource = (src: string) => {
    setCollapsedSources((prev) => {
      const n = new Set(prev);
      if (n.has(src)) n.delete(src); else n.add(src);
      return n;
    });
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, iRes] = await Promise.all([
        fetch(`${API}/scout/sources`),
        fetch(`${API}/scout/inbox?status=${filter === "all" ? "" : filter}`),
      ]);
      const sData = await sRes.json();
      const iData = await iRes.json();
      setSources(sData.sources || []);
      setInbox(iData.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const updateStatus = async (filename: string, newStatus: string) => {
    try {
      await fetch(`${API}/scout/inbox/${encodeURIComponent(filename)}/status?new_status=${newStatus}`, { method: "POST" });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefresh = async () => {
    // S62 — Fetch réel : lance scout_check_new_content.py via endpoint backend
    setRefreshing(true);
    try {
      const res = await fetch(`${API}/scout/fetch-new`, { method: "POST" });
      if (!res.ok) {
        const err = await res.text();
        alert(`Erreur fetch : ${err}`);
        return;
      }
      const data = await res.json();
      const n = data.new_items || 0;
      if (n > 0) {
        alert(`✨ ${n} nouveau${n > 1 ? "x" : ""} item${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""} à l'inbox`);
      } else {
        alert("Aucun nouveau contenu détecté (déjà à jour ou pas de nouvelles vidéos depuis le dernier check).");
      }
      // Refresh la liste après fetch
      await loadData();
    } catch (e) {
      alert(`Erreur : ${(e as Error).message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const stats = {
    sources_active: sources.filter((s) => s.active).length,
    inbox_total: inbox.length,
    pending: inbox.filter((i) => i.status === "pending").length,
    flagged: inbox.filter((i) => i.status === "flagged").length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text flex items-center gap-2">
            <Eye size={20} />
            Scout Watch
          </h1>
          <p className="text-xs text-muted mt-0.5">Veille auteurs trading + analyse ponctuelle</p>
          {/* S62 — Dernier contenu indicator */}
          {(() => {
            if (inbox.length === 0) return null;
            const dates = inbox.map((i) => new Date(i.published).getTime()).filter((t) => !isNaN(t));
            if (dates.length === 0) return null;
            const latest = Math.max(...dates);
            const ageMs = Date.now() - latest;
            const ageDays = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
            const latestDate = new Date(latest).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
            const isStale = ageDays > 3;
            return (
              <p className={`text-[11px] mt-1 font-medium ${isStale ? "text-amber-600" : "text-muted"}`}>
                {isStale && "⚠️ "}Dernier contenu : <span className="font-semibold">{latestDate}</span>
                {ageDays === 0 ? " · aujourd'hui"
                  : ageDays === 1 ? " · il y a 1 jour"
                  : ` · il y a ${ageDays} jours`}
              </p>
            );
          })()}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 text-xs rounded border border-border hover:border-blue/40 hover:bg-blue/5 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            disabled
            title="Désactivé — clé Anthropic API requise (à venir)"
            className="px-3 py-1.5 text-xs rounded border border-border opacity-50 cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus size={13} />
            Ajouter source
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[11px] text-muted">Sources actives</div>
          <div className="text-xl font-medium mt-1">{stats.sources_active}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[11px] text-muted">Inbox total</div>
          <div className="text-xl font-medium mt-1">{stats.inbox_total}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[11px] text-muted">À évaluer</div>
          <div className="text-xl font-medium mt-1 text-blue">{stats.pending}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[11px] text-muted">Flagged</div>
          <div className="text-xl font-medium mt-1 text-green-600">{stats.flagged}</div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-purple-600" />
          <span className="font-medium text-sm">Quick Analyzer</span>
          <span className="text-[11px] text-muted">— clique « Analyser » sur un item de l'inbox pour évaluation Claude</span>
        </div>
        <div className="mt-1 text-[11px] text-green-600">
          ✓ Clé Anthropic configurée · endpoint /scout/analyze actif
        </div>
      </div>

      {/* Onglets — S60 T-43 */}
      <div className="flex items-center gap-1 border-b border-border mb-4">
        <button
          onClick={() => setActiveTab("content")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${activeTab === "content" ? "border-blue text-blue" : "border-transparent text-muted hover:text-text"}`}
        >
          <Inbox size={14} /> Contenu
        </button>
        <button
          onClick={() => setActiveTab("traders")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${activeTab === "traders" ? "border-purple-600 text-purple-700" : "border-transparent text-muted hover:text-text"}`}
        >
          <Users size={14} /> Traders
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-300 font-semibold">T-43</span>
        </button>
        <button
          onClick={() => setActiveTab("briefs")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${activeTab === "briefs" ? "border-blue text-blue" : "border-transparent text-muted hover:text-text"}`}
        >
          <FileText size={14} /> Briefs
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-300">Bientôt</span>
        </button>
        <button
          onClick={() => setActiveTab("hypotheses")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${activeTab === "hypotheses" ? "border-amber-600 text-amber-700" : "border-transparent text-muted hover:text-text"}`}
        >
          <Lightbulb size={14} /> Hypothèses
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300 font-semibold">T-50</span>
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "traders" && <ScoutTradersTab />}
      {activeTab === "hypotheses" && <ScoutHypothesesTab />}
      {activeTab === "briefs" && <ScoutBriefsTab />}
      {activeTab === "content" && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-sm flex items-center gap-2">
              <Inbox size={14} />
              Inbox ({inbox.length})
            </div>
            <div className="flex gap-1.5 text-[11px]">
              {[
                { key: "pending",  label: "À traiter"   },
                { key: "snoozed",  label: "Plus tard"   },
                { key: "ignored",  label: "Ignoré"      },
                { key: "all",      label: "Tous"        },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setFilter(s.key)}
                  className={`px-2.5 py-1 rounded ${filter === s.key ? "bg-blue/20 text-blue font-medium" : "bg-surface-hover text-muted hover:bg-border"}`}
                >
                  {s.label}
                </button>
              ))}
              {/* S62 — Toggle Vue plate / groupée */}
              <div className="ml-2 flex border border-border rounded overflow-hidden">
                <button
                  onClick={() => setViewMode("grouped")}
                  className={`px-2 py-1 ${viewMode === "grouped" ? "bg-blue/20 text-blue font-medium" : "bg-surface-hover text-muted hover:bg-border"}`}
                  title="Vue groupée par source"
                >Groupé</button>
                <button
                  onClick={() => setViewMode("flat")}
                  className={`px-2 py-1 ${viewMode === "flat" ? "bg-blue/20 text-blue font-medium" : "bg-surface-hover text-muted hover:bg-border"}`}
                  title="Vue plate (tous les items à plat)"
                >Plat</button>
              </div>
            </div>
          </div>

          {loading && <div className="text-xs text-muted text-center py-8">Chargement…</div>}
          {error && <div className="text-xs text-red-500 text-center py-8">Erreur : {error}</div>}
          {!loading && inbox.length === 0 && (
            <div className="text-center py-12 text-xs text-muted">
              <Inbox size={32} className="mx-auto mb-3 opacity-30" />
              <p>Aucun item — lance le worker</p>
              <code className="text-[10px] mt-2 inline-block bg-surface-hover px-2 py-1 rounded">python tools/scout_check_new_content.py --refresh-all</code>
            </div>
          )}

          {/* S62 — Vue groupée par source (au-dessus du flat) */}
          {viewMode === "grouped" && (() => {
            // Grouper inbox par source
            const groups = new Map<string, InboxItem[]>();
            for (const it of inbox) {
              if (!groups.has(it.source)) groups.set(it.source, []);
              groups.get(it.source)!.push(it);
            }
            // Tri sources : avec items en premier, alphabétique
            const sortedSources = Array.from(groups.keys()).sort();
            return (
              <div className="space-y-2">
                {sortedSources.map((src) => {
                  const items = groups.get(src) || [];
                  const isCollapsed = collapsedSources.has(src);
                  const newest = items.reduce((max, it) => {
                    const t = new Date(it.published).getTime();
                    return isNaN(t) ? max : Math.max(max, t);
                  }, 0);
                  const newestStr = newest > 0 ? new Date(newest).toLocaleDateString("fr-CA") : "—";
                  return (
                    <div key={src} className="border border-border rounded overflow-hidden">
                      <button
                        onClick={() => toggleSource(src)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-surface-hover hover:bg-border transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="text-muted text-xs">{isCollapsed ? "▶" : "▼"}</span>
                          <span>{src}</span>
                          <span className="text-[11px] text-muted font-normal">— {items.length} item{items.length > 1 ? "s" : ""}</span>
                        </div>
                        <span className="text-[10px] text-muted">Dernier : {newestStr}</span>
                      </button>
                      {!isCollapsed && (
                        <div className="p-2 space-y-1.5">
                          {items.map((item) => (
                            <div key={item.filename} className="border border-border rounded p-2.5 hover:border-blue/40 transition-colors">
                              <div className="flex justify-between items-start gap-3 mb-1">
                                <div className="flex-1 min-w-0">
                                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-blue truncate block flex items-center gap-1">
                                    {item.title}
                                    <ExternalLink size={10} className="opacity-50 flex-shrink-0" />
                                  </a>
                                  <div className="text-[11px] text-muted mt-0.5">{item.published.substring(0, 10)}</div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                                  {(() => {
                                    const cfg = (
                                      item.status === "flagged" ? { color: "#16a34a", label: "Flagged" } :
                                      item.status === "ignored" ? { color: "#dc2626", label: "Ignored" } :
                                      item.status === "snoozed" ? { color: "#f59e0b", label: "Snoozed" } :
                                      item.status === "pending" ? { color: "#f59e0b", label: "Pending" } :
                                      { color: "#6b7280", label: item.status }
                                    );
                                    return (
                                      <span
                                        className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap"
                                        style={{ color: cfg.color }}
                                        title={`Statut : ${cfg.label}`}
                                      >
                                        <span className="text-[9px] leading-none">●</span>
                                        {cfg.label}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                              {item.status === "pending" && (
                                <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-border">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
                                        const res = await fetch(`${API_BASE}/scout/analyze/${encodeURIComponent(item.filename)}`, { method: "POST" });
                                        if (!res.ok) { alert("Erreur analyse : HTTP " + res.status); return; }
                                        const data = await res.json();
                                        const a = data.analysis || {};
                                        alert(`Score : ${a.score ?? "?"}/6 · ${a.classification ?? "?"}\n\nRésumé : ${a.summary ?? "—"}\n\nRecommandation : ${a.recommendation ?? "—"}`);
                                        loadData();
                                      } catch (e) {
                                        alert("Erreur : " + (e as Error).message);
                                      }
                                    }}
                                    className="text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center gap-1"
                                  >
                                    <Sparkles size={10} /> Analyser
                                  </button>
                                  <button onClick={() => updateStatus(item.filename, "snoozed")} className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center gap-1">
                                    <Clock size={10} /> Plus tard
                                  </button>
                                  <button onClick={() => updateStatus(item.filename, "ignored")} className="text-[11px] px-2 py-0.5 rounded text-muted hover:bg-surface-hover flex items-center gap-1">
                                    <X size={10} /> Ignorer
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {viewMode === "flat" && (
          <div className="space-y-1.5">
            {inbox.slice(0, 30).map((item) => (
              <div key={item.filename} className="border border-border rounded p-2.5 hover:border-blue/40 transition-colors">
                <div className="flex justify-between items-start gap-3 mb-1">
                  <div className="flex-1 min-w-0">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-blue truncate block flex items-center gap-1">
                      {item.title}
                      <ExternalLink size={10} className="opacity-50 flex-shrink-0" />
                    </a>
                    <div className="text-[11px] text-muted mt-0.5">{item.source} · {item.published.substring(0, 10)}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    {item.paradigms.slice(0, 3).map((p) => (
                      <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-blue/10 text-blue border border-blue/20">{p}</span>
                    ))}
                    {/* S62 Option D — Statut minimaliste (point + texte coloré, sans badge) */}
                    {(() => {
                      const cfg = (
                        item.status === "flagged" ? { color: "#16a34a", label: "Flagged" } :
                        item.status === "ignored" ? { color: "#dc2626", label: "Ignored" } :
                        item.status === "snoozed" ? { color: "#f59e0b", label: "Snoozed" } :
                        item.status === "pending" ? { color: "#f59e0b", label: "Pending" } :
                        { color: "#6b7280", label: item.status }
                      );
                      return (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap"
                          style={{ color: cfg.color }}
                          title={`Statut : ${cfg.label}`}
                        >
                          <span className="text-[9px] leading-none">●</span>
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {item.status === "pending" && (
                  <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-border">
                    <button
                      onClick={async () => {
                        try {
                          const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
                          const res = await fetch(`${API_BASE}/scout/analyze/${encodeURIComponent(item.filename)}`, { method: "POST" });
                          if (!res.ok) { alert("Erreur analyse : HTTP " + res.status); return; }
                          const data = await res.json();
                          const a = data.analysis || {};
                          alert(`Score : ${a.score ?? "?"}/6 · ${a.classification ?? "?"}\n\nParadigmes : ${(a.paradigmes_detectes || []).join(", ") || "—"}\nFiltres : ${Object.entries(a.filters || {}).map(([k,v]) => `${k}=${v?"✓":"✗"}`).join(", ")}\n\nRésumé : ${a.summary ?? "—"}\n\nRecommandation : ${a.recommendation ?? "—"}\n\nCoût : $${(data.cost_estimate_usd ?? 0).toFixed(4)}`);
                          loadData();
                        } catch (e) {
                          alert("Erreur : " + (e as Error).message);
                        }
                      }}
                      className="text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center gap-1"
                    >
                      <Sparkles size={10} /> Analyser
                    </button>
                    <button onClick={() => updateStatus(item.filename, "snoozed")} className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center gap-1">
                      <Clock size={10} /> Plus tard
                    </button>
                    <button onClick={() => updateStatus(item.filename, "ignored")} className="text-[11px] px-2 py-0.5 rounded text-muted hover:bg-surface-hover flex items-center gap-1">
                      <X size={10} /> Ignorer
                    </button>
                  </div>
                )}
              </div>
            ))}
            {inbox.length > 30 && (
              <div className="text-center text-[11px] text-muted py-2 italic">
                + {inbox.length - 30} autres items (filtre pour affiner)
              </div>
            )}
          </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="font-medium text-sm mb-3">Sources ({sources.length})</div>
          <div className="space-y-2">
            {sources.map((s) => (
              <div key={s.name} className={`text-xs p-2 rounded border ${s.active ? "border-border" : "border-border opacity-50"}`}>
                <a href={s.handle_url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-blue flex items-center gap-1">
                  {s.name}
                  <ExternalLink size={9} className="opacity-50" />
                </a>
                <div className="text-[10px] text-muted mt-0.5">
                  {s.channel_id ? `Channel ${s.channel_id.substring(0, 12)}…` : "channel_id non résolu"}
                </div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    s.weight === "high" ? "bg-green-100 text-green-800" :
                    s.weight === "medium" ? "bg-amber-100 text-amber-800" :
                    "bg-surface-hover text-muted"
                  }`}>{s.weight}</span>
                  {s.paradigms.slice(0, 2).map((p) => (
                    <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-blue/10 text-blue">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted">
            <p className="font-medium text-text mb-1">Worker manuel</p>
            <code className="block bg-surface-hover p-1.5 rounded text-[10px] mt-1">
              cd ~/trading-lab<br/>
              python tools/scout_check_new_content.py
            </code>
            <p className="mt-2 italic">Auto-scheduler (cron quotidien) à venir S56+</p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
