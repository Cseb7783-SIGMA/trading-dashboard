"use client";
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  createSeriesMarkers,
  ColorType,
  IChartApi,
  ISeriesApi,
  ISeriesMarkersPluginApi,
  UTCTimestamp,
} from "lightweight-charts";

type Bar = { time: number; open: number; high: number; low: number; close: number };
type Marker = { time: number; position: "aboveBar" | "belowBar"; color: string; shape: "arrowUp" | "arrowDown"; text: string };
type ChartData = { instrument: string; timeframe: string; bars: Bar[]; markers: Marker[]; n_bars: number; n_markers: number };

const ASSETS = ["QQQ", "SPY", "IWM"];
const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"];

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function isDarkMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    || document.documentElement.classList.contains("dark");
}

export default function PriceChart({ runId, defaultAsset, defaultTf }: { runId: string; defaultAsset?: string; defaultTf?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<UTCTimestamp> | null>(null);
  const [asset, setAsset] = useState(defaultAsset || "QQQ");
  const [tf, setTf] = useState(defaultTf || "15m");
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const dark = isDarkMode();
    const colors = dark
      ? { text: "#9CA3AF", grid: "#1F2937", border: "#374151" }
      : { text: "#374151", grid: "#E5E7EB", border: "#D1D5DB" };

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 500,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: colors.text },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: colors.border },
      rightPriceScale: { borderColor: colors.border },
      crosshair: { mode: 1 },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10B981", downColor: "#EF4444",
      borderUpColor: "#10B981", borderDownColor: "#EF4444",
      wickUpColor: "#10B981", wickDownColor: "#EF4444",
    });
    const markersPlugin = createSeriesMarkers(series, []);

    chartRef.current = chart;
    seriesRef.current = series;
    markersPluginRef.current = markersPlugin;

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    setError(null);
    fetch(`${API}/runs/${encodeURIComponent(runId)}/chart-data?asset=${asset}&tf=${tf}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((d: ChartData) => {
        setData(d);
        if (seriesRef.current && d.bars.length) {
          const bars = d.bars.map((b) => ({ ...b, time: b.time as UTCTimestamp }));
          seriesRef.current.setData(bars);
          if (markersPluginRef.current) {
            const markers = d.markers.map((m) => ({
              ...m,
              time: m.time as UTCTimestamp,
              size: 1,
            }));
            markersPluginRef.current.setMarkers(markers as any);
          }
          chartRef.current?.timeScale().fitContent();
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [runId, asset, tf]);

  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-2">
          {ASSETS.map((a) => (
            <button key={a} onClick={() => setAsset(a)}
              className={`px-3 py-1 text-xs rounded ${asset === a ? "bg-blue/20 text-blue font-medium" : "bg-surface-hover text-muted hover:bg-border"}`}>
              {a}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {TIMEFRAMES.map((t) => (
            <button key={t} onClick={() => setTf(t)}
              className={`px-3 py-1 text-xs rounded ${tf === t ? "bg-blue/20 text-blue font-medium" : "bg-surface-hover text-muted hover:bg-border"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="relative" style={{ minHeight: "500px" }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted bg-surface/80 z-10">
            Chargement du chart…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-red-500 bg-surface/80 z-10">
            Erreur : {error}
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: "500px" }} />
      </div>
      {data && !loading && !error && (
        <div className="mt-3 pt-3 border-t border-border flex justify-between items-center text-xs text-muted">
          <span>{data.n_bars.toLocaleString()} bougies · {data.n_markers} trades · {data.instrument} {data.timeframe}</span>
          <span className="flex gap-3">
            <span><span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>Entry long</span>
            <span><span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>Entry short</span>
          </span>
        </div>
      )}
    </div>
  );
}
