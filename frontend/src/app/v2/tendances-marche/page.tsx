"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

type Market = "Indices" | "Forex" | "Crypto" | "Métaux";
type Timeframe = "W" | "D" | "4H" | "1H" | "30M";
type Direction = "Haussier" | "Baissier";

type AssetTrend = {
  asset: string;
  market: Market;
  trends: Record<Timeframe, Direction>;
};

const TIMEFRAMES: Timeframe[] = ["W", "D", "4H", "1H", "30M"];
const MARKETS: (Market | "Tous")[] = ["Tous", "Indices", "Forex", "Crypto", "Métaux"];

const DEMO_ASSETS: AssetTrend[] = [
  { asset: "NAS100", market: "Indices", trends: { W: "Haussier", D: "Haussier", "4H": "Haussier", "1H": "Haussier", "30M": "Haussier" } },
  { asset: "SPX", market: "Indices", trends: { W: "Haussier", D: "Haussier", "4H": "Haussier", "1H": "Baissier", "30M": "Haussier" } },
  { asset: "DAX", market: "Indices", trends: { W: "Baissier", D: "Baissier", "4H": "Haussier", "1H": "Baissier", "30M": "Baissier" } },
  { asset: "EURUSD", market: "Forex", trends: { W: "Baissier", D: "Baissier", "4H": "Baissier", "1H": "Baissier", "30M": "Baissier" } },
  { asset: "GBPUSD", market: "Forex", trends: { W: "Haussier", D: "Haussier", "4H": "Baissier", "1H": "Haussier", "30M": "Baissier" } },
  { asset: "BTCUSD", market: "Crypto", trends: { W: "Baissier", D: "Baissier", "4H": "Baissier", "1H": "Baissier", "30M": "Baissier" } },
  { asset: "ETHUSD", market: "Crypto", trends: { W: "Haussier", D: "Baissier", "4H": "Baissier", "1H": "Baissier", "30M": "Baissier" } },
  { asset: "XAUUSD", market: "Métaux", trends: { W: "Haussier", D: "Haussier", "4H": "Haussier", "1H": "Haussier", "30M": "Haussier" } },
];

function alignment(asset: AssetTrend, timeframes: Timeframe[]) {
  const bullish = timeframes.filter((tf) => asset.trends[tf] === "Haussier").length;
  const bearish = timeframes.length - bullish;
  const direction: Direction = bullish >= bearish ? "Haussier" : "Baissier";
  const count = Math.max(bullish, bearish);
  return { direction, percentage: Math.round((count / timeframes.length) * 100) };
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={active
        ? "rounded bg-blue px-2.5 py-1.5 text-xs font-medium text-white"
        : "rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-muted hover:bg-ink hover:text-text"}
    >
      {children}
    </button>
  );
}

export default function MarketTrendsPage() {
  const [market, setMarket] = useState<Market | "Tous">("Tous");
  const [direction, setDirection] = useState<Direction | "Tous">("Tous");
  const [timeframes, setTimeframes] = useState<Timeframe[]>(TIMEFRAMES);

  const rows = useMemo(() => DEMO_ASSETS
    .filter((item) => market === "Tous" || item.market === market)
    .filter((item) => direction === "Tous" || alignment(item, timeframes).direction === direction)
    .sort((a, b) => alignment(b, timeframes).percentage - alignment(a, timeframes).percentage),
  [market, direction, timeframes]);

  const bullish = rows.filter((item) => {
    const result = alignment(item, timeframes);
    return result.direction === "Haussier" && result.percentage === 100;
  });
  const bearish = rows.filter((item) => {
    const result = alignment(item, timeframes);
    return result.direction === "Baissier" && result.percentage === 100;
  });

  function toggleTimeframe(timeframe: Timeframe) {
    setTimeframes((current) => current.includes(timeframe)
      ? (current.length === 1 ? current : current.filter((item) => item !== timeframe))
      : TIMEFRAMES.filter((item) => [...current, timeframe].includes(item)));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-blue">V2 · Prototype</div>
          <h1 className="text-xl font-semibold text-text">Tendances du marché</h1>
          <p className="mt-1 text-xs text-muted">Instantané de démonstration · 19 juillet 2026 · 8:00 HE</p>
        </div>
        <span className="rounded bg-blue/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue">
          Données simulées
        </span>
      </header>

      <section className="space-y-3 rounded-lg border border-border bg-surface p-4" aria-label="Filtres du rapport">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-28 text-xs text-muted">Marché</span>
          {MARKETS.map((item) => <FilterButton key={item} active={market === item} onClick={() => setMarket(item)}>{item}</FilterButton>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-28 text-xs text-muted">Unités de temps</span>
          {TIMEFRAMES.map((item) => <FilterButton key={item} active={timeframes.includes(item)} onClick={() => toggleTimeframe(item)}>{item}</FilterButton>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-28 text-xs text-muted">Afficher</span>
          {(["Tous", "Haussier", "Baissier"] as const).map((item) => <FilterButton key={item} active={direction === item} onClick={() => setDirection(item)}>{item}</FilterButton>)}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Alignements complets">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-sm text-text"><TrendingUp size={16} className="text-emerald-500" /> Alignement haussier complet</div>
          <div className="mt-2 text-2xl font-semibold text-text">{bullish.length}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {bullish.length ? bullish.map((item) => <span key={item.asset} className="rounded-full border border-border px-2.5 py-1 text-xs text-text">{item.asset}</span>) : <span className="text-xs text-muted">Aucun actif</span>}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-sm text-text"><TrendingDown size={16} className="text-red-500" /> Alignement baissier complet</div>
          <div className="mt-2 text-2xl font-semibold text-text">{bearish.length}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {bearish.length ? bearish.map((item) => <span key={item.asset} className="rounded-full border border-border px-2.5 py-1 text-xs text-text">{item.asset}</span>) : <span className="text-xs text-muted">Aucun actif</span>}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text">Détail par actif</h2>
          <span className="text-xs text-muted">{rows.length} actifs affichés</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-4 py-3 text-left font-medium">Actif</th>
                {timeframes.map((tf) => <th key={tf} className="px-3 py-3 text-center font-medium">{tf}</th>)}
                <th className="px-4 py-3 text-right font-medium">Alignement</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const result = alignment(item, timeframes);
                return (
                  <tr key={item.asset} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{item.asset}</td>
                    {timeframes.map((tf) => (
                      <td key={tf} className="px-3 py-3 text-center" aria-label={item.trends[tf]}>
                        <span className={item.trends[tf] === "Haussier" ? "text-emerald-500" : "text-red-500"}>
                          {item.trends[tf] === "Haussier" ? "▲" : "▼"}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-medium text-text">{result.percentage} % {result.direction.toLowerCase()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[10px] text-muted/70">
        100 % signifie que toutes les unités de temps sélectionnées indiquent la même direction au moment du rapport. Ce pourcentage n&apos;est pas une probabilité de réussite.
      </p>
    </div>
  );
}
