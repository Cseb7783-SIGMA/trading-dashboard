"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { fetchPaperAverages, type PaperAveragesData } from "@/lib/api";

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-hover rounded p-2">
      <div className="text-[11px] text-muted uppercase tracking-wide">{label}</div>
      <div className="text-base font-semibold">{value}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export default function PaperAverages() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PaperAveragesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !data && !error) {
      fetchPaperAverages().then(setData).catch((e) => setError(e.message));
    }
  }, [open, data, error]);

  const fmt = (v: number | null, suffix = "", sign = false) =>
    v === null || v === undefined ? "—" : `${sign && v > 0 ? "+" : ""}${v.toFixed(2)}${suffix}`;

  return (
    <div className="bg-surface border border-border rounded-lg">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center px-4 py-3 text-sm font-medium text-muted hover:text-foreground"
      >
        <span>Moyennes des strategies en paper (benchmark)</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          {error && <div className="text-xs text-red-500">Erreur : {error}</div>}
          {!error && !data && <div className="text-xs text-muted">Chargement...</div>}
          {data && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric label="PnL moyen" value={fmt(data.avg_pnl, " $", true)} sub={fmt(data.avg_pnl_pct, "%", true)} />
                <Metric label="Max Drawdown moyen" value={fmt(data.avg_max_drawdown_pct, "%")} />
                <Metric label="Trades gagnants moy." value={fmt(data.avg_win_rate, "%")} />
                <Metric label="Profit Factor moyen" value={fmt(data.avg_profit_factor)} />
              </div>
              <div className="mt-2 text-[11px] text-muted">
                Moyenne sur {data.n_valid} strategies en paper
                {data.n_skipped ? ` (${data.n_skipped} sans KPIs valides, ignorees)` : ""}.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
