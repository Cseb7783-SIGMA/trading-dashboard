"use client";
import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, LineSeries, BaselineSeries, createSeriesMarkers, type IChartApi, type ISeriesApi, type UTCTimestamp, type SeriesMarker, type Time, LineStyle } from "lightweight-charts";
import { fetchLiveBars, fetchPaperData, fetchLiveIndicators, type LiveBar, type PaperData, type LiveIndicators } from "@/lib/api";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

type Props = {
  symbol: string;
  tf: string;
  runId?: string;
  strategyName?: string;
  height?: number;
};

// Mapping stratégie → indicateurs à afficher
function getIndicatorsForStrategy(name?: string): { ema?: number; bb_length?: number; bb_mult?: number; rsi_length?: number; avwap?: boolean; volume_profile?: boolean } {
  if (!name) return { ema: 100 };
  const n = name.toLowerCase();
  if (n.includes("bb_rsi") || n.includes("dual_tf_divergence")) {
    return { bb_length: 20, bb_mult: 2.0, rsi_length: 14 };
  }
  if (n.includes("fabio") || n.includes("naked_poc") || n.includes("value_area")) {
    return { ema: 200, volume_profile: true };
  }
  if (n.includes("avwap") || n.includes("f10")) {
    return { ema: 100, avwap: true };
  }
  if (n.includes("range_filter")) {
    return { ema: 200 };
  }
  if (n.includes("ema_crossover")) {
    return { emas: "5,20,50" };
  }
  if (n.includes("v1e") || n.includes("v1a") || n.includes("f1_")) {
    return { ema: 100 };
  }
  return { ema: 100 };
}

export default function LiveChart({ symbol, tf, runId, strategyName, height = 400 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  // Lignes pour SL/TP/Entry de la position ouverte
  const entryLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const slLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const tpLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const markersApiRef = useRef<ReturnType<typeof createSeriesMarkers> | null>(null);
  // Indicator overlay refs
  const emaLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emasLinesRef = useRef<ISeriesApi<"Line">[]>([]);  // S60 multi-EMA
  const closedTradeLinesRef = useRef<ISeriesApi<"Line">[]>([]);  // S61 lignes entry trades fermés
  const closedTradeZonesRef = useRef<ISeriesApi<"Baseline">[]>([]);  // S61 zones SL/TP trades fermés
  const bbUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<"Line"> | null>(null);
  const avwapLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vpLinesRef = useRef<ISeriesApi<"Line">[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [barCount, setBarCount] = useState(0);
  const [paperInfo, setPaperInfo] = useState<{ trades: number; openPos: boolean } | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<string[]>([]);

  // Init chart
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height,
      layout: { background: { color: "transparent" }, textColor: "#999", fontSize: 11 },
      grid: { vertLines: { color: "#e5e7eb22" }, horzLines: { color: "#e5e7eb22" } },
      rightPriceScale: { borderColor: "#e5e7eb44" },
      timeScale: { borderColor: "#e5e7eb44", timeVisible: true, secondsVisible: tf.includes("m") && parseInt(tf) < 5 },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#15803D",
      downColor: "#DC2626",
      borderUpColor: "#15803D",
      borderDownColor: "#DC2626",
      wickUpColor: "#15803D",
      wickDownColor: "#DC2626",
    });
    chartRef.current = chart;
    seriesRef.current = series;
    markersApiRef.current = createSeriesMarkers(series, []);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);
    chart.applyOptions({ width: containerRef.current.clientWidth });

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      entryLineRef.current = null;
      slLineRef.current = null;
      tpLineRef.current = null;
      closedTradeLinesRef.current = [];
      closedTradeZonesRef.current = [];
      markersApiRef.current = null;
      emaLineRef.current = null;
      bbUpperRef.current = null;
      bbMiddleRef.current = null;
      bbLowerRef.current = null;
      avwapLineRef.current = null;
      vpLinesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, tf]);

  async function refresh() {
    try {
      const indConfig = getIndicatorsForStrategy(strategyName);
      const [r, paper, indResult] = await Promise.all([
        fetchLiveBars(symbol, tf, 200),
        runId ? fetchPaperData(runId).catch(() => ({ run_id: runId, state: null, trades: [], has_data: false } as PaperData)) : Promise.resolve(null),
        Object.keys(indConfig).length > 0 ? fetchLiveIndicators(symbol, tf, indConfig, 200).catch(() => null as LiveIndicators | null) : Promise.resolve(null),
      ]);

      if (!r.ok || !r.bars) {
        setError(r.error || "no data");
        setLoading(false);
        return;
      }
      const data = r.bars.map((b: LiveBar) => ({
        time: b.time as UTCTimestamp,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }));
      if (seriesRef.current) {
        seriesRef.current.setData(data);
      }

      // ─── Triggers : markers paper trades ───
      const markers: SeriesMarker<Time>[] = [];
      if (paper && paper.trades) {
        for (const t of paper.trades) {
          const entryTs = Math.floor(new Date(t.entry_ts).getTime() / 1000) as UTCTimestamp;
          const exitTs = Math.floor(new Date(t.exit_ts).getTime() / 1000) as UTCTimestamp;
          const isLong = t.direction.toUpperCase().includes("LONG");
          const won = t.pnl >= 0;
          // Entry marker
          markers.push({
            time: entryTs,
            position: isLong ? "belowBar" : "aboveBar",
            color: isLong ? "#15803D" : "#DC2626",
            shape: isLong ? "arrowUp" : "arrowDown",
            text: `${isLong ? "LONG" : "SHORT"} @${t.entry_price.toFixed(2)}`,
            size: 1,
          });
          // Exit marker
          markers.push({
            time: exitTs,
            position: won ? "aboveBar" : "belowBar",
            color: won ? "#15803D" : "#DC2626",
            shape: won ? "circle" : "square",
            text: `${t.exit_reason} ${won ? "+" : ""}$${t.pnl.toFixed(0)}`,
            size: 1,
          });
        }
      }
      if (markersApiRef.current) {
        markersApiRef.current.setMarkers(markers);
      }

      // ─── Lignes pour position ouverte ───
      // Nettoyer anciennes lignes
      if (entryLineRef.current && chartRef.current) {
        chartRef.current.removeSeries(entryLineRef.current);
        entryLineRef.current = null;
      }
      if (slLineRef.current && chartRef.current) {
        chartRef.current.removeSeries(slLineRef.current);
        slLineRef.current = null;
      }
      if (tpLineRef.current && chartRef.current) {
        chartRef.current.removeSeries(tpLineRef.current);
        tpLineRef.current = null;
      }

      // ─── Zones SL/TP pour trades fermés récents (S61 style SMC/ICT) ───
      // Cleanup anciennes lignes + zones au refresh
      if (chartRef.current && closedTradeLinesRef.current.length > 0) {
        closedTradeLinesRef.current.forEach((line) => {
          try { chartRef.current?.removeSeries(line); } catch {}
        });
        closedTradeLinesRef.current = [];
      }
      if (chartRef.current && closedTradeZonesRef.current.length > 0) {
        closedTradeZonesRef.current.forEach((zone) => {
          try { chartRef.current?.removeSeries(zone); } catch {}
        });
        closedTradeZonesRef.current = [];
      }
      if (paper && paper.trades && paper.trades.length > 0 && chartRef.current && data.length > 0) {
        // Dessine les 3 derniers trades fermés en zones colorées style SMC
        const recent = paper.trades.slice(-3);
        const firstBarTime = data[0].time as number;
        const lastBarTime = data[data.length - 1].time as number;
        // Forcer interprétation UTC si pas de timezone suffix (CSV stocke "2026-06-03T12:55:00" sans Z)
        const parseUtc = (ts: string): number => {
          const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(ts);
          return Math.floor(new Date(hasTz ? ts : ts + "Z").getTime() / 1000);
        };
        for (const t of recent) {
          const entryTsRaw = parseUtc(t.entry_ts);
          const exitTsRaw = parseUtc(t.exit_ts);
          // Skip trades complètement hors range visible du chart
          if (exitTsRaw < firstBarTime || entryTsRaw > lastBarTime) continue;
          // Skip trades avec timestamps invalides (NaN ou entry >= exit)
          if (!Number.isFinite(entryTsRaw) || !Number.isFinite(exitTsRaw) || entryTsRaw >= exitTsRaw) continue;
          // Calculer TF dynamiquement pour étendre 3 bars (cohérence avec zones position ouverte)
          const tfSec = data.length >= 2 ? ((data[1].time as number) - (data[0].time as number)) : 300;
          // Clamp aux bornes du chart pour éviter ordre temporel cassé
          const entryTs = Math.max(entryTsRaw, firstBarTime) as UTCTimestamp;
          // Étendre 3 bars après l'exit (compact comme dans LuxAlgo/SMC)
          const extendedExitTs = Math.min(exitTsRaw + 3 * tfSec, lastBarTime) as UTCTimestamp;
          // Garantie ordre asc strict (sinon Lightweight Charts crash)
          if ((extendedExitTs as number) <= (entryTs as number)) continue;
          // Entry line (bleu pointillé fin, label "Entry @ X")
          const entryLine = chartRef.current.addSeries(LineSeries, {
            color: "#3B82F6",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: true,
            title: `Entry @ ${t.entry_price.toFixed(2)}`,
          });
          entryLine.setData([
            { time: entryTs, value: t.entry_price },
            { time: extendedExitTs, value: t.entry_price },
          ]);
          closedTradeLinesRef.current.push(entryLine);
          // Niveaux SL/TP (fallback exit_price si pas stockés)
          const slLevel = typeof t.sl === "number"
            ? t.sl
            : (t.exit_reason === "SL" ? t.exit_price : null);
          const tpLevel = typeof t.tp === "number"
            ? t.tp
            : (t.exit_reason === "TP" ? t.exit_price : null);
          // ZONE VERTE (TP) — rectangle semi-transparent entre Entry et TP
          if (tpLevel !== null) {
            const tpZone = chartRef.current.addSeries(BaselineSeries, {
              baseValue: { type: "price", price: t.entry_price },
              topLineColor: "rgba(22, 163, 74, 0.9)",
              topFillColor1: "rgba(22, 163, 74, 0.45)",
              topFillColor2: "rgba(22, 163, 74, 0.25)",
              bottomLineColor: "rgba(0,0,0,0)",
              bottomFillColor1: "rgba(0,0,0,0)",
              bottomFillColor2: "rgba(0,0,0,0)",
              lineWidth: 2,
              lastValueVisible: true,
              priceLineVisible: false,
              priceScaleId: "right",
              title: `TP @ ${tpLevel.toFixed(2)}`,
            });
            tpZone.setData([
              { time: entryTs, value: tpLevel },
              { time: extendedExitTs, value: tpLevel },
            ]);
            closedTradeZonesRef.current.push(tpZone);
          }
          // ZONE ROUGE (SL) — rectangle semi-transparent entre Entry et SL
          if (slLevel !== null) {
            const slZone = chartRef.current.addSeries(BaselineSeries, {
              baseValue: { type: "price", price: t.entry_price },
              topLineColor: "rgba(0,0,0,0)",
              topFillColor1: "rgba(0,0,0,0)",
              topFillColor2: "rgba(0,0,0,0)",
              bottomLineColor: "rgba(220, 38, 38, 0.9)",
              bottomFillColor1: "rgba(220, 38, 38, 0.45)",
              bottomFillColor2: "rgba(220, 38, 38, 0.25)",
              lineWidth: 2,
              lastValueVisible: true,
              priceLineVisible: false,
              priceScaleId: "right",
              title: `SL @ ${slLevel.toFixed(2)}`,
            });
            slZone.setData([
              { time: entryTs, value: slLevel },
              { time: extendedExitTs, value: slLevel },
            ]);
            closedTradeZonesRef.current.push(slZone);
          }
        }
      }

      if (paper && paper.state?.in_position && chartRef.current) {
        const state = paper.state;
        const firstTime = data[0].time;
        const lastTime = data[data.length - 1].time;
        // Calculer TF dynamiquement depuis 2 bars consécutifs (en secondes)
        const tfSec = data.length >= 2 ? ((data[1].time as number) - (data[0].time as number)) : 300;
        // Position d'entrée : si state.entry_bar_ts dispo, l'utiliser ; sinon utiliser firstTime
        const entryBarTs = state.entry_bar_ts
          ? Math.floor(new Date(state.entry_bar_ts + (/Z$|[+-]\d{2}:?\d{2}$/.test(state.entry_bar_ts) ? "" : "Z")).getTime() / 1000)
          : (firstTime as number);
        // Zone compacte : 3 bars de large à partir de l'entry, ou jusqu'au présent si déjà passé
        const zoneStart = Math.max(entryBarTs, firstTime as number) as UTCTimestamp;
        const zoneEnd = Math.min((entryBarTs + 3 * tfSec), lastTime as number) as UTCTimestamp;
        // Si zone trop courte (entry au-delà du chart), fallback sur dernier bar
        const safeZoneEnd = (zoneEnd as number) > (zoneStart as number)
          ? zoneEnd
          : (lastTime as UTCTimestamp);
        // Entry line (compacte, 3 bars de large)
        if (state.entry_price) {
          const line = chartRef.current.addSeries(LineSeries, {
            color: "#3B82F6",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: true,
            title: `Entry @ ${state.entry_price.toFixed(2)}`,
          });
          line.setData([
            { time: zoneStart, value: state.entry_price },
            { time: safeZoneEnd, value: state.entry_price },
          ]);
          entryLineRef.current = line;
        }
        // SL ZONE (rouge) — rectangle entre Entry et SL pour position ouverte
        if (state.sl && state.entry_price) {
          const slZone = chartRef.current.addSeries(BaselineSeries, {
            baseValue: { type: "price", price: state.entry_price },
            topLineColor: "rgba(0,0,0,0)",
            topFillColor1: "rgba(0,0,0,0)",
            topFillColor2: "rgba(0,0,0,0)",
            bottomLineColor: "rgba(220, 38, 38, 0.9)",
            bottomFillColor1: "rgba(220, 38, 38, 0.45)",
            bottomFillColor2: "rgba(220, 38, 38, 0.25)",
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            priceScaleId: "right",
            title: `SL @ ${state.sl.toFixed(2)}`,
          });
          slZone.setData([
            { time: zoneStart, value: state.sl },
            { time: safeZoneEnd, value: state.sl },
          ]);
          slLineRef.current = slZone as unknown as ISeriesApi<"Line">;
        }
        // TP ZONE (verte) — rectangle entre Entry et TP pour position ouverte
        if (state.tp && state.entry_price) {
          const tpZone = chartRef.current.addSeries(BaselineSeries, {
            baseValue: { type: "price", price: state.entry_price },
            topLineColor: "rgba(22, 163, 74, 0.9)",
            topFillColor1: "rgba(22, 163, 74, 0.45)",
            topFillColor2: "rgba(22, 163, 74, 0.25)",
            bottomLineColor: "rgba(0,0,0,0)",
            bottomFillColor1: "rgba(0,0,0,0)",
            bottomFillColor2: "rgba(0,0,0,0)",
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            priceScaleId: "right",
            title: `TP @ ${state.tp.toFixed(2)}`,
          });
          tpZone.setData([
            { time: zoneStart, value: state.tp },
            { time: safeZoneEnd, value: state.tp },
          ]);
          tpLineRef.current = tpZone as unknown as ISeriesApi<"Line">;
        }
      }

      // ─── Indicateurs techniques superposés ───
      // Cleanup previous indicators
      // Multi-EMA cleanup
      emasLinesRef.current.forEach((line) => {
        if (chartRef.current) chartRef.current.removeSeries(line);
      });
      emasLinesRef.current = [];
      [emaLineRef, bbUpperRef, bbMiddleRef, bbLowerRef, avwapLineRef].forEach((ref) => {
        if (ref.current && chartRef.current) {
          chartRef.current.removeSeries(ref.current);
          ref.current = null;
        }
      });
      const activeNames: string[] = [];

      if (indResult?.ok && indResult.indicators && chartRef.current) {
        const ind = indResult.indicators;
        // EMA (single — legacy)
        if (ind.ema && ind.ema.points.length > 0) {
          const line = chartRef.current.addSeries(LineSeries, {
            color: "#F59E0B",
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            title: `EMA(${ind.ema.length})`,
          });
          line.setData(ind.ema.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
          emaLineRef.current = line;
          activeNames.push(`EMA(${ind.ema.length})`);
        }
        // Multi-EMA (S60 ema_crossover : 3 lignes de couleurs distinctes)
        if (ind.emas && ind.emas.length > 0) {
          const colors = ["#10B981", "#3B82F6", "#EF4444"];  // green/blue/red
          ind.emas.forEach((emaCfg, idx) => {
            if (emaCfg.points.length === 0 || !chartRef.current) return;
            const color = colors[idx % colors.length];
            const widthMap: Record<number, 1 | 2 | 3 | 4> = { 0: 2, 1: 2, 2: 3 };
            const line = chartRef.current.addSeries(LineSeries, {
              color, lineWidth: widthMap[idx] || 2,
              priceLineVisible: false, lastValueVisible: true,
              title: `EMA(${emaCfg.length})`,
            });
            line.setData(emaCfg.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
            emasLinesRef.current.push(line);
            activeNames.push(`EMA(${emaCfg.length})`);
          });
        }
        // Bollinger Bands
        if (ind.bb && ind.bb.upper.length > 0) {
          const bbColor = "#8B5CF6";
          const upper = chartRef.current.addSeries(LineSeries, {
            color: bbColor, lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
            lineStyle: LineStyle.Dotted, title: "BB upper",
          });
          upper.setData(ind.bb.upper.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
          bbUpperRef.current = upper;
          const middle = chartRef.current.addSeries(LineSeries, {
            color: bbColor, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: "BB mid",
          });
          middle.setData(ind.bb.middle.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
          bbMiddleRef.current = middle;
          const lower = chartRef.current.addSeries(LineSeries, {
            color: bbColor, lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
            lineStyle: LineStyle.Dotted, title: "BB lower",
          });
          lower.setData(ind.bb.lower.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
          bbLowerRef.current = lower;
          activeNames.push(`BB(${ind.bb.length}, ${ind.bb.mult})`);
        }
        // AVWAP
        if (ind.avwap && ind.avwap.points.length > 0) {
          const line = chartRef.current.addSeries(LineSeries, {
            color: "#06B6D4", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: "AVWAP",
          });
          line.setData(ind.avwap.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
          avwapLineRef.current = line;
          activeNames.push("AVWAP");
        }
        if (ind.rsi) {
          activeNames.push(`RSI(${ind.rsi.length})`);
        }
        // Volume Profile : POC/VAH/VAL des N dernières sessions (lignes horizontales)
        if (ind.volume_profile && ind.volume_profile.sessions && chartRef.current) {
          // Nettoyer anciennes
          vpLinesRef.current.forEach((l) => chartRef.current?.removeSeries(l));
          vpLinesRef.current = [];
          const sessions = ind.volume_profile.sessions;
          const allTimes = data.map((d) => d.time);
          if (allTimes.length > 0) {
            sessions.forEach((s, idx: number) => {
              const isLast = idx === sessions.length - 1;
              const opacity = isLast ? 1.0 : 0.4;
              const widthLine = isLast ? 2 : 1;
              const sessTime = s.session_ts as UTCTimestamp;
              // POC (rouge, ligne pleine)
              const pocLine = chartRef.current!.addSeries(LineSeries, {
                color: `rgba(220, 38, 38, ${opacity})`,
                lineWidth: widthLine, priceLineVisible: false, lastValueVisible: isLast,
                title: isLast ? `POC ${s.session_date.slice(5)}` : "",
              });
              pocLine.setData([{ time: sessTime, value: s.poc }, { time: allTimes[allTimes.length - 1], value: s.poc }]);
              vpLinesRef.current.push(pocLine);
              // VAH (vert)
              const vahLine = chartRef.current!.addSeries(LineSeries, {
                color: `rgba(21, 128, 61, ${opacity})`,
                lineWidth: widthLine, priceLineVisible: false, lastValueVisible: isLast,
                lineStyle: LineStyle.Dashed,
                title: isLast ? `VAH ${s.session_date.slice(5)}` : "",
              });
              vahLine.setData([{ time: sessTime, value: s.vah }, { time: allTimes[allTimes.length - 1], value: s.vah }]);
              vpLinesRef.current.push(vahLine);
              // VAL (bleu)
              const valLine = chartRef.current!.addSeries(LineSeries, {
                color: `rgba(59, 130, 246, ${opacity})`,
                lineWidth: widthLine, priceLineVisible: false, lastValueVisible: isLast,
                lineStyle: LineStyle.Dashed,
                title: isLast ? `VAL ${s.session_date.slice(5)}` : "",
              });
              valLine.setData([{ time: sessTime, value: s.val }, { time: allTimes[allTimes.length - 1], value: s.val }]);
              vpLinesRef.current.push(valLine);
            });
            activeNames.push(`Volume Profile (${sessions.length} sess)`);
          }
        }
      }
      setActiveIndicators(activeNames);

      setPaperInfo({
        trades: paper?.trades?.length ?? 0,
        openPos: paper?.state?.in_position ?? false,
      });

      chartRef.current?.timeScale().fitContent();
      setBarCount(data.length);
      setLastUpdate(new Date().toLocaleTimeString("fr-CA"));
      setError(null);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 30000); // 30s
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, tf, runId, strategyName]);

  return (
    <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-text">📈 Chart live</h4>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
            {symbol} · {tf} · yfinance
          </span>
          {paperInfo && paperInfo.openPos && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              🟢 Position ouverte
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted">
          {paperInfo && <span>{paperInfo.trades} paper trades</span>}
          <span>{barCount} bougies</span>
          {lastUpdate && <span className="font-mono">maj {lastUpdate}</span>}
          <button onClick={refresh} className="hover:text-text" title="Refresh">
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs p-2.5 rounded bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span className="font-mono break-all">{error}</span>
        </div>
      )}

      <div className="relative" style={{ minHeight: height }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-10">
            <Loader2 size={20} className="animate-spin text-muted" />
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height }} />
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted">
        <span>Refresh auto 30s pendant heures de marché.</span>
        <span className="flex items-center gap-2 flex-wrap">
          {activeIndicators.length > 0 && (
            <span className="text-blue-700">📊 {activeIndicators.join(" · ")}</span>
          )}
          <span>▲ Entry LONG · ▼ Entry SHORT · ● Win · ■ Loss</span>
        </span>
      </div>
    </div>
  );
}
