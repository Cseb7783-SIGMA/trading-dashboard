import { useState } from "react";
import Tooltip from "@/components/ui/Tooltip";
import type { Run } from "@/lib/types";
import { colorClass, ddColor, pfColor, propColor, sharpeColor, tradesColor, wrColor } from "@/lib/colors";

type ColKey = "pf" | "dd" | "wr" | "sharpe" | "trades" | "consec_w" | "consec_l" | "z_score" | "prop" | "score";
type Dir = "asc" | "desc";

const COLS: { key: ColKey; label: string; tooltip: string; higherIsBetter: boolean }[] = [
  { key: "pf",     label: "PF",     tooltip: "Profit Factor — ratio gains bruts / pertes brutes. ≥ 1.5 robuste · 1.2–1.5 marginal · < 1.2 à rejeter.",                           higherIsBetter: true  },
  { key: "dd",     label: "DD%",    tooltip: "Drawdown maximal — perte maximale depuis un pic d'équité. FTMO exige < 10%. Plus bas = meilleur.",                                  higherIsBetter: false },
  { key: "wr",     label: "Win%",   tooltip: "Win Rate — pourcentage de trades gagnants. À interpréter avec le ratio gain/perte moyen.",                                          higherIsBetter: true  },
  { key: "sharpe", label: "Sharpe", tooltip: "Sharpe Ratio — rendement ajusté par la volatilité. ≥ 1.0 = bon · < 0.8 = trop volatile pour un compte géré.",                     higherIsBetter: true  },
  { key: "trades", label: "Trades", tooltip: "Nombre total de trades. < 25 = statistiquement fragile · ≥ 50 recommandé.",                                                         higherIsBetter: true  },
  { key: "consec_w", label: "ConsW", tooltip: "Max consecutive wins — Challenge Z TMAFX ≥ 5.",                                                                                       higherIsBetter: true  },
  { key: "consec_l", label: "ConsL", tooltip: "Max consecutive losses — Challenge Z TMAFX ≤ 3.",                                                                                     higherIsBetter: false },
  { key: "z_score",  label: "Z",     tooltip: "Challenge Z Score /5 — compatibilité TMAFX.",                                                                                          higherIsBetter: true  },
  { key: "prop",   label: "Prop",   tooltip: "Prop Score /5 — compatibilité FTMO 100k$. Critères : DD < 5%/j, DD < 10% total, profit ≥ 8%, trades ≥ 25, PF ≥ 1.2.",            higherIsBetter: true  },
  { key: "score",  label: "Score",  tooltip: "Score composite /100 — combinaison pondérée PF ×3, DD ×2, Sharpe ×1, Win% ×1 avec bonus de significativité.",                     higherIsBetter: true  },
];

function getValue(run: Run, key: ColKey): number {
  const k = run.kpis;
  switch (key) {
    case "pf":     return k.profit_factor;
    case "dd":     return k.max_drawdown_pct;
    case "wr":     return k.win_rate;
    case "sharpe": return k.sharpe_ratio;
    case "trades": return k.total_trades;
    case "consec_w": return k.max_consec_wins;
    case "consec_l": return k.max_consec_losses;
    case "z_score":  return k.challenge_z_score;
    case "prop":   return k.prop_score;
    case "score":  return k.composite_score;
  }
}

function SortIcon({ active, dir }: { active: boolean; dir: Dir }) {
  if (!active) return <span className="ml-1 text-[10px] opacity-30">↕</span>;
  return <span className="ml-1 text-[10px] text-blue">{dir === "desc" ? "↓" : "↑"}</span>;
}

function ColTh({ col, active, dir, onClick }: {
  col: typeof COLS[0];
  active: boolean;
  dir: Dir;
  onClick: () => void;
}) {
  return (
    <th className="text-right px-4 py-3">
      <div className="flex items-center justify-end gap-1.5">
        <Tooltip label={col.label} text={col.tooltip} />
        <button onClick={onClick} className="flex items-center justify-end hover:text-text transition-colors">
          {col.label}<SortIcon active={active} dir={dir} />
        </button>
      </div>
    </th>
  );
}

export default function CompareTable({ runs }: { runs: Run[] }) {
  const [sortKey, setSortKey] = useState<ColKey>("score");
  const [sortDir, setSortDir] = useState<Dir>("desc");

  if (runs.length < 2) {
    return <div className="text-center py-8 text-muted text-sm">Sélectionnez au moins 2 stratégies</div>;
  }

  const handleSort = (key: ColKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...runs].sort((a, b) => {
    const va = getValue(a, sortKey);
    const vb = getValue(b, sortKey);
    return sortDir === "desc" ? vb - va : va - vb;
  });

  const best = (vals: number[], higherIsBetter = true) => {
    const extreme = higherIsBetter ? Math.max(...vals) : Math.min(...vals);
    return vals.map((v) => v === extreme);
  };

  const pfs    = runs.map((r) => r.kpis.profit_factor);
  const dds    = runs.map((r) => r.kpis.max_drawdown_pct);
  const wrs    = runs.map((r) => r.kpis.win_rate);
  const sharps = runs.map((r) => r.kpis.sharpe_ratio);
  const trades = runs.map((r) => r.kpis.total_trades);
  const conswArr = runs.map((r) => r.kpis.max_consec_wins);
  const conslArr = runs.map((r) => r.kpis.max_consec_losses);
  const zArr  = runs.map((r) => r.kpis.challenge_z_score);
  const props  = runs.map((r) => r.kpis.prop_score);
  const comps  = runs.map((r) => r.kpis.composite_score);

  const bestMap: Record<ColKey, boolean[]> = {
    pf:     best(pfs),
    dd:     best(dds, false),
    wr:     best(wrs),
    sharpe: best(sharps),
    trades: best(trades),
    consec_w: best(conswArr),
    consec_l: best(conslArr, false),
    z_score:  best(zArr),
    prop:   best(props),
    score:  best(comps),
  };

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border text-xs text-muted uppercase tracking-wider">Matrice KPIs</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted text-xs">
            <th className="text-left px-4 py-3">Stratégie</th>
            {COLS.map((col) => (
              <ColTh
                key={col.key}
                col={col}
                active={sortKey === col.key}
                dir={sortDir}
                onClick={() => handleSort(col.key)}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((run) => {
            const k = run.kpis;
            const origIdx = runs.indexOf(run);
            return (
              <tr key={run.run_id} className="border-b border-border/50 hover:bg-ink">
                <td className="px-4 py-3">
                  <div className="font-medium">{run.strategy.name} <span className="text-muted text-xs">{run.strategy.version}</span></div>
                  <div className="text-xs text-muted">{run.universe.instrument} · {run.universe.timeframe}</div>
                </td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${colorClass(pfColor(k.profit_factor))} ${bestMap.pf[origIdx] ? "underline decoration-dotted" : ""}`}>{k.profit_factor.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colorClass(ddColor(k.max_drawdown_pct))} ${bestMap.dd[origIdx] ? "underline decoration-dotted" : ""}`}>{k.max_drawdown_pct.toFixed(1)}%</td>
                <td className={`px-4 py-3 text-right font-mono ${colorClass(wrColor(k.win_rate))} ${bestMap.wr[origIdx] ? "underline decoration-dotted" : ""}`}>{k.win_rate.toFixed(1)}%</td>
                <td className={`px-4 py-3 text-right font-mono ${colorClass(sharpeColor(k.sharpe_ratio))} ${bestMap.sharpe[origIdx] ? "underline decoration-dotted" : ""}`}>{k.sharpe_ratio.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colorClass(tradesColor(k.total_trades))} ${bestMap.trades[origIdx] ? "underline decoration-dotted" : ""}`}>{k.total_trades}</td>
                <td className={`px-4 py-3 text-right font-mono ${bestMap.consec_w[origIdx] ? "underline decoration-dotted" : ""}`}>{k.max_consec_wins}</td>
                <td className={`px-4 py-3 text-right font-mono ${bestMap.consec_l[origIdx] ? "underline decoration-dotted" : ""}`}>{k.max_consec_losses}</td>
                <td className={`px-4 py-3 text-right font-mono ${bestMap.z_score[origIdx] ? "underline decoration-dotted" : ""} ${k.challenge_z_score >= 4 ? "text-green-400 font-semibold" : k.challenge_z_score >= 3 ? "text-amber-400" : "text-zinc-500"}`}>{k.challenge_z_score}/5</td>
                <td className={`px-4 py-3 text-right font-mono ${colorClass(propColor(k.prop_score))} ${bestMap.prop[origIdx] ? "underline decoration-dotted" : ""}`}>{k.prop_score}/5</td>
                <td className={`px-4 py-3 text-right font-semibold text-blue ${bestMap.score[origIdx] ? "underline decoration-dotted" : ""}`}>{k.composite_score}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-2 text-[11px] text-muted border-t border-border">Souligné = meilleur · Cliquez sur une colonne pour trier</div>
    </div>
  );
}
