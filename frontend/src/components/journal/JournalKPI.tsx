import { JOURNAL_ENTRIES, STRATEGY_SUMMARY } from "./journalData";

export default function JournalKPI() {
  // Clean state S59 — toutes valeurs zéro tant qu'aucune stratégie active
  const totalTrades = JOURNAL_ENTRIES.filter(e => e.statut !== "SKIP").length;
  const balance = 0;
  const winRate: number | null = null;
  const strategiesActives = STRATEGY_SUMMARY.length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="bg-surface border border-border rounded-lg p-3">
        <div className="text-[11px] text-muted uppercase tracking-wider mb-1">Trades pris (cumul)</div>
        <div className="text-lg font-semibold">{totalTrades}</div>
        <div className="text-[10px] text-muted/70">en attente d'activité</div>
      </div>
      <div className="bg-surface border border-border rounded-lg p-3">
        <div className="text-[11px] text-muted uppercase tracking-wider mb-1">Balance globale</div>
        <div className="text-lg font-semibold">—</div>
        <div className="text-[10px] text-muted/70">aucune stratégie active</div>
      </div>
      <div className="bg-surface border border-border rounded-lg p-3">
        <div className="text-[11px] text-muted uppercase tracking-wider mb-1">Win rate global</div>
        <div className="text-lg font-semibold">{winRate ?? "—"}</div>
        <div className="text-[10px] text-muted/70">N/A</div>
      </div>
      <div className="bg-surface border border-border rounded-lg p-3">
        <div className="text-[11px] text-muted uppercase tracking-wider mb-1">Stratégies actives</div>
        <div className="text-lg font-semibold">{strategiesActives}</div>
        <div className="text-[10px] text-muted/70">Phase 3 — D-001 v2</div>
      </div>
    </div>
  );
}
