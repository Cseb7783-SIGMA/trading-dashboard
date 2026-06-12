"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { fetchPaperPnlBreakdown, fetchRunPnlBreakdown, type PaperPnlBreakdownData, type PnlScope, type PnlCell } from "@/lib/api";

const WIN_LABEL: Record<string, string> = { "24h": "24 h", "48h": "48 h", "7j": "7 j", "14j": "14 j", "30j": "30 j" };
const DOT: Record<string, string> = { "New York": "#185FA5", "London": "#534AB7", "Asia": "#888780", "Sydney": "#888780" };
const GREEN = "#16a34a", RED = "#dc2626";

function money(v: number): string {
  const r = Math.round(v);
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toLocaleString("fr-FR")} $`;
}

export default function PaperPnlBreakdown({ scope, runId }: { scope?: PnlScope; runId?: string }) {
  const [open, setOpen] = useState(true);
  const [data, setData] = useState<PaperPnlBreakdownData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || data || error) return;
    const p = runId ? fetchRunPnlBreakdown(runId) : fetchPaperPnlBreakdown(scope ?? "scalping");
    p.then(setData).catch((e) => setError(e.message));
  }, [open, data, error, scope, runId]);

  const windows = data?.windows ?? ["24h", "48h", "7j", "14j", "30j"];

  const Cell = ({ c, total }: { c: PnlCell; total?: boolean }) => {
    if (!c || c.trades === 0)
      return <td className="text-right px-2 py-2 text-muted">—</td>;
    const color = c.pnl > 0 ? GREEN : c.pnl < 0 ? RED : undefined;
    return (
      <td className="text-right px-2 py-2">
        <div className={total ? "font-medium" : ""} style={{ color }}>{money(c.pnl)}</div>
        {total && <div className="text-[11px] text-muted">{c.trades} trade{c.trades > 1 ? "s" : ""}</div>}
      </td>
    );
  };

  return (
    <div className="bg-surface border border-border rounded-lg">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center px-4 py-3 text-sm font-medium text-muted hover:text-foreground"
      >
        <span>PnL paper — session × fenêtre</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          {error && <div className="text-xs text-red-500">Erreur : {error}</div>}
          {!error && !data && <div className="text-xs text-muted">Chargement…</div>}
          {data && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted text-[12px]">
                      <th className="text-left px-2 py-2 font-medium">Session</th>
                      {windows.map((w) => (
                        <th key={w} className="text-right px-2 py-2 font-medium">{WIN_LABEL[w] ?? w}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.sessions.map((s) => (
                      <tr key={s.name} className="border-t border-border">
                        <td className="px-2 py-2">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: DOT[s.name] ?? "#888780" }} />
                            {s.name}
                          </span>
                          <div className="text-[11px] text-muted">{s.utc} UTC</div>
                        </td>
                        {windows.map((w) => <Cell key={w} c={s.cells[w]} />)}
                      </tr>
                    ))}
                    <tr className="border-t border-border bg-surface-hover">
                      <td className="px-2 py-2 font-medium">Total</td>
                      {windows.map((w) => <Cell key={w} c={data.total[w]} total />)}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-[11px] text-muted">
                Heure d&apos;entrée convertie en UTC (source ET). Sessions contiguës sans chevauchement →
                le total des sessions = PnL global.
                {data.n_trades_total === 0 && " Aucun trade pour ce périmètre pour l'instant."}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
