"use client";
import { useEffect, useState } from "react";
import { Eye, RefreshCw, Plus, Sparkles, Flag, Clock, X, ExternalLink, Inbox, Users, FileText } from "lucide-react";
import ScoutTradersTab from "@/components/scout/ScoutTradersTab";

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
  const [activeTab, setActiveTab] = useState<"content"|"traders"|"briefs">("content");
  const [filter, setFilter] = useState<string>("pending");
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      loadData();
      setRefreshing(false);
    }, 500);
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
      </div>

      {/* Tab content */}
      {activeTab === "traders" && <ScoutTradersTab />}
      {activeTab === "briefs" && (
        <div className="bg-surface border border-border rounded-lg p-8 text-center">
          <FileText size={32} className="mx-auto mb-3 text-muted opacity-50" />
          <h3 className="text-sm font-medium mb-1">Historique des briefs</h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            Cette section conservera l'historique des Trader Discovery Briefs générés (Implémenter / Investiguer / Skip).
            Disponible après le premier brief approuvé par Sebast.
          </p>
        </div>
      )}
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
                { key: "pending",  label: "À traiter" },
                { key: "flagged",  label: "Marqué"    },
                { key: "snoozed",  label: "Reporté"   },
                { key: "ignored",  label: "Ignoré"    },
                { key: "all",      label: "Tous"      },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setFilter(s.key)}
                  className={`px-2.5 py-1 rounded ${filter === s.key ? "bg-blue/20 text-blue font-medium" : "bg-surface-hover text-muted hover:bg-border"}`}
                >
                  {s.label}
                </button>
              ))}
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
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      item.status === "flagged" ? "bg-green-100 text-green-800" :
                      item.status === "ignored" ? "bg-red-100 text-red-800" :
                      item.status === "snoozed" ? "bg-amber-100 text-amber-800" :
                      "bg-blue/10 text-blue"
                    }`}>{item.status}</span>
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
                    <button onClick={() => updateStatus(item.filename, "flagged")} className="text-[11px] px-2 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1">
                      <Flag size={10} /> Flag
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
