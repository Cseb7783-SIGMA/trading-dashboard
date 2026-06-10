"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { fetchPaperLiveAverages, type PaperLiveAveragesData } from "@/lib/api";

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
  const [live, setLive] = useState<PaperLiveAveragesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !live && !error) {
      fetchPaperLiveAverages().then(setLive).catch((e) => setError(e.message));
    }
  }, [open, live, error]);

  const fmt = (v: number | null | undefined, suffix = "", sign = false) =>
    v === null || v === undefined ? "—" : `${sign && v > 0 ? "+" : ""}${v.toFixed(2)}${suffix}`;

  return (
    <div className="bg-surface border border-border rounded-lg">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center px-4 py-3 text-sm font-medium text-muted hover:text-foreground"
      >
        <span>Performance paper — vrais trades (live)</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          {error && <div className="text-xs text-red-500">Erreur : {error}</div>}
          {!error && !live && <div className="text-xs text-muted">Chargement...</div>}
          {live && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric label="PnL total réel" value={fmt(live.total_pnl, " $", true)} sub={`${live.n_trades} trades`} />
                <Metric label="Trades gagnants" value={fmt(live.win_rate, "%")} />
                <Metric label="Profit Factor" value={fmt(live.profit_factor)} />
                <Metric label="PnL moyen / trade" value={fmt(live.avg_pnl_per_trade, " $", true)} />
              </div>
              <div className="mt-2 text-[11px] text-muted">
                {live.n_with_trades}/{live.n_paper} stratégies ont des trades paper
                {live.last_trade_at ? ` · dernier trade : ${String(live.last_trade_at).slice(0, 16)}` : ""}.
                Évolue au fil des vrais trades.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
