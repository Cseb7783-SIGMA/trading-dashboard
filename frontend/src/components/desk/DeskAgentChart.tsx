"use client";
import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, createSeriesMarkers, LineStyle, type IChartApi, type UTCTimestamp } from "lightweight-charts";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

type Pt = { time: number; value: number };
type Bar = { time: number; open: number; high: number; low: number; close: number };
type ChartData = {
  bars: Bar[];
  volume: { time: number; value: number; color: string }[];
  ema5: Pt[]; ema20: Pt[]; ema50: Pt[]; avwap: Pt[];
  levels: { direction?: string; entry?: number; sl?: number; tp?: number; entry_time?: number | null };
  used_tf?: string;
};

export default function DeskAgentChart({ callId, height = 360 }: { callId: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedTf, setUsedTf] = useState<string | undefined>();

  useEffect(() => {
    let chart: IChartApi | null = null;
    let disposed = false;
    let ro: ResizeObserver | null = null;
    setLoading(true);
    setErr(null);
    fetch(`${BASE}/desk-agent/calls/${encodeURIComponent(callId)}/chart-data`, { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d: ChartData) => {
        if (disposed || !ref.current) return;
        setUsedTf(d.used_tf);
        chart = createChart(ref.current, {
          height,
          layout: { background: { color: "transparent" }, textColor: "#999", fontSize: 11 },
          grid: { vertLines: { color: "#e5e7eb22" }, horzLines: { color: "#e5e7eb22" } },
          rightPriceScale: { borderColor: "#e5e7eb44" },
          timeScale: { borderColor: "#e5e7eb44", timeVisible: true },
        });
        const candle = chart.addSeries(CandlestickSeries, {
          upColor: "#15803D", downColor: "#DC2626", borderUpColor: "#15803D",
          borderDownColor: "#DC2626", wickUpColor: "#15803D", wickDownColor: "#DC2626",
        });
        candle.setData(d.bars.map((b) => ({ time: b.time as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close })));
        if (d.volume && d.volume.length) {
          const vs = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "", priceLineVisible: false, lastValueVisible: false });
          vs.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
          vs.setData(d.volume.map((v) => ({ time: v.time as UTCTimestamp, value: v.value, color: v.color })));
        }
        chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.08, bottom: 0.26 } });
        const addLine = (pts: Pt[], color: string, w = 1) => {
          if (!pts || !pts.length || !chart) return;
          const s = chart.addSeries(LineSeries, { color, lineWidth: w as 1 | 2 | 3 | 4, priceLineVisible: false, lastValueVisible: false });
          s.setData(pts.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        };
        addLine(d.ema5, "#378ADD");
        addLine(d.ema20, "#EF9F27");
        addLine(d.ema50, "#A32D2D");
        addLine(d.avwap, "#7F77DD", 2);
        const lv = d.levels || {};
        const pl = (price: number | undefined, color: string, title: string) => {
          if (price == null) return;
          candle.createPriceLine({ price, color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title });
        };
        pl(lv.entry, "#888780", "Entrée");
        pl(lv.sl, "#DC2626", "SL");
        pl(lv.tp, "#15803D", "TP");
        if (lv.entry_time) {
          const short = (lv.direction || "").toLowerCase() === "short";
          createSeriesMarkers(candle, [{
            time: lv.entry_time as UTCTimestamp,
            position: short ? "aboveBar" : "belowBar",
            color: short ? "#DC2626" : "#15803D",
            shape: short ? "arrowDown" : "arrowUp",
            text: short ? "SHORT" : "LONG",
          }]);
        }
        chart.timeScale().fitContent();
        ro = new ResizeObserver(() => { if (ref.current && chart) chart.applyOptions({ width: ref.current.clientWidth }); });
        ro.observe(ref.current);
        chart.applyOptions({ width: ref.current.clientWidth });
        setLoading(false);
      })
      .catch((e) => { if (!disposed) { setErr(String(e.message || e)); setLoading(false); } });
    return () => { disposed = true; if (ro) ro.disconnect(); if (chart) chart.remove(); };
  }, [callId, height]);

  return (
    <div>
      <div ref={ref} style={{ width: "100%" }} />
      {loading && <div className="text-xs text-muted py-2">Chargement du chart…</div>}
      {err && <div className="text-xs text-muted py-2">Chart indisponible (code {err}) — données peut-être absentes pour cet actif / timeframe.</div>}
      {!loading && !err && (
        <div className="flex gap-3 flex-wrap text-[11px] text-muted mt-1">
          <span><span style={{ display: "inline-block", width: 14, height: 3, background: "#378ADD", verticalAlign: "middle", marginRight: 4 }} />EMA5</span>
          <span><span style={{ display: "inline-block", width: 14, height: 3, background: "#EF9F27", verticalAlign: "middle", marginRight: 4 }} />EMA20</span>
          <span><span style={{ display: "inline-block", width: 14, height: 3, background: "#A32D2D", verticalAlign: "middle", marginRight: 4 }} />EMA50</span>
          <span><span style={{ display: "inline-block", width: 14, height: 3, background: "#7F77DD", verticalAlign: "middle", marginRight: 4 }} />AVWAP</span>
          <span>· lignes Entrée / SL / TP{usedTf ? ` · TF ${usedTf}` : ""}</span>
        </div>
      )}
    </div>
  );
}
