import { JOURNAL_ENTRIES } from "./journalData";

export default function JournalTable() {
  if (JOURNAL_ENTRIES.length === 0) {
    return (
      <div className="bg-surface border border-border border-dashed rounded-lg p-5 text-center text-xs text-muted">
        Le journal détaillé apparaîtra ici jour par jour quand tes stratégies trading en live.
        Une ligne par jour ouvré, SKIP inclus pour la discipline (Phase 3).
      </div>
    );
  }

  // Future implementation : afficher table des entries
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-muted text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-2">Date</th>
            <th className="text-left px-4 py-2">Stratégie</th>
            <th className="text-left px-4 py-2">Statut</th>
            <th className="text-right px-4 py-2">PnL</th>
            <th className="text-right px-4 py-2">Balance</th>
            <th className="text-left px-4 py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {JOURNAL_ENTRIES.map((e, idx) => (
            <tr key={idx} className="border-b border-border/50">
              <td className="px-4 py-2">{e.date}</td>
              <td className="px-4 py-2 font-medium">{e.strategie}</td>
              <td className="px-4 py-2">{e.statut}</td>
              <td className={`px-4 py-2 text-right font-mono ${e.pnl > 0 ? "text-green-400" : e.pnl < 0 ? "text-red-300" : ""}`}>{e.pnl >= 0 ? "+" : ""}${e.pnl.toFixed(2)}</td>
              <td className="px-4 py-2 text-right font-mono">${e.balance.toLocaleString()}</td>
              <td className="px-4 py-2 text-xs text-muted">{e.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
