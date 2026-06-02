"use client";
import { useEffect, useState } from "react";
import { Pause, Play, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type PauseStatus = {
  paused: boolean;
  run_ids: string[];
  paused_at: string | null;
  count?: number;
};

export default function PaperPauseControl() {
  const [status, setStatus] = useState<PauseStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    try {
      const r = await fetch(`${API}/paper-trader/pause-status`);
      const j = await r.json();
      setStatus(j);
    } catch (e) {
      setError("status fetch failed");
    }
  }

  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 30_000); // refresh chaque 30s
    return () => clearInterval(id);
  }, []);

  async function handlePauseAll() {
    if (!confirm("Arrêter tous les paper traders actifs ? (ils pourront être repris après)")) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`${API}/paper-trader/pause-all`, { method: "POST" });
      const j = await r.json();
      if (!j.ok && !j.paused_count && !j.already_paused) {
        setError(j.detail || "erreur pause");
      }
      await loadStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleResumeAll() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`${API}/paper-trader/resume-all`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) {
        setError(j.error || j.detail || "erreur resume");
      }
      await loadStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!status) {
    return (
      <div className="px-3 py-2 text-[10px] text-muted/60 flex items-center gap-1.5">
        <Loader2 size={10} className="animate-spin" />
        <span>Paper status...</span>
      </div>
    );
  }

  const isPaused = status.paused;

  return (
    <div className="px-3 py-2 space-y-1.5">
      <div className="text-[10px] font-semibold tracking-wider text-muted/70 uppercase">
        Paper Traders
      </div>
      {isPaused ? (
        <button
          onClick={handleResumeAll}
          disabled={busy}
          className="w-full flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-green-50 hover:bg-green-100 border border-green-300 text-green-700 disabled:opacity-50 transition-colors"
          title={`${status.count || status.run_ids.length} traders pausés depuis ${status.paused_at?.slice(0, 16) || "?"}`}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          <span>Reprendre tous ({status.count || status.run_ids.length})</span>
        </button>
      ) : (
        <button
          onClick={handlePauseAll}
          disabled={busy}
          className="w-full flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 disabled:opacity-50 transition-colors"
          title="Stoppe tous les paper traders actifs. La reprise restaure uniquement ceux qui tournaient avant la pause. Utile pour pauses planifiées (weekend, vacances, maintenance)."
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
          <span>Pause tous</span>
        </button>
      )}
      {isPaused && (
        <div className="text-[9px] text-amber-700 leading-tight">
          ⏸ {status.count || status.run_ids.length} traders en pause depuis{" "}
          {status.paused_at ? new Date(status.paused_at).toLocaleString("fr-CA", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : "?"}
        </div>
      )}
      {error && (
        <div className="text-[9px] text-red-600 leading-tight">{error}</div>
      )}
    </div>
  );
}
