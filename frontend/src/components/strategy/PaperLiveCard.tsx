"use client";
import { useEffect, useState } from "react";
import { Play, Square, Activity, Clock, TrendingUp, TrendingDown, AlertCircle, Loader2 } from "lucide-react";
import { fetchPaperData, paperTraderStart, paperTraderStop, paperTraderStatus, fetchLivePrice, type PaperData, type PaperTrade } from "@/lib/api";


// S65 — Calcule Max Consecutive Wins / Losses depuis liste trades paper
function computeStreaks(trades: Array<{ pnl?: number | null }>) {
  let mcw = 0, mcl = 0, curW = 0, curL = 0;
  for (const t of trades) {
    const pnl = t.pnl;
    if (pnl !== null && pnl !== undefined && pnl > 0) {
      curW++; curL = 0;
      if (curW > mcw) mcw = curW;
    } else if (pnl !== null && pnl !== undefined && pnl < 0) {
      curL++; curW = 0;
      if (curL > mcl) mcl = curL;
    }
  }
  return { mcw, mcl };
}

type Props = { runId: string; instrument?: string };

export default function PaperLiveCard({ runId, instrument }: Props) {
  const [data, setData] = useState<PaperData | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [pid, setPid] = useState<number | null>(null);
  const [loading, setLoading] = useState<"start" | "stop" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState<{ price: number; change_pct: number; ts: string; yf_symbol?: string } | null>(null);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);  // 60 derniers prix (10 min à 10s)

  async function refresh() {
    try {
      const [d, s] = await Promise.all([fetchPaperData(runId), paperTraderStatus(runId)]);
      setData(d);
      setRunning(Boolean(s.running));
      const piInfo = (s as any).pid_info as { pid?: number } | undefined;
      setPid(piInfo?.pid ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 30000); // polling 30s
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    if (!instrument) return;
    async function refreshPrice() {
      try {
        const p = await fetchLivePrice(instrument!);
        console.log("[PaperLiveCard] /price/" + instrument + " response:", p);
        if (p.ok && p.price !== undefined) {
          setLivePrice({ price: p.price, change_pct: p.change_pct ?? 0, ts: p.ts ?? "", yf_symbol: p.yf_symbol });
          setPriceHistory((prev) => {
            const newHist = [...prev, p.price!];
            return newHist.slice(-60); // garde 60 derniers
          });
        } else {
          console.warn("[PaperLiveCard] livePrice NOT set, ok=", p.ok, "price=", p.price, "error=", p.error);
        }
      } catch (e) {
        console.error("[PaperLiveCard] fetchLivePrice threw:", e);
      }
    }
    refreshPrice();
    const iv = setInterval(refreshPrice, 10000); // 10s
    return () => clearInterval(iv);
  }, [instrument]);

  async function handleStart() {
    setLoading("start");
    setError(null);
    try {
      const res = await paperTraderStart(runId);
      if (!res.ok && res.error) throw new Error(res.error);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleStop() {
    setLoading("stop");
    setError(null);
    try {
      await paperTraderStop(runId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  const state = data?.state;
  const trades = data?.trades ?? [];
  const recent = trades.slice(-5).reverse();

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text">Paper Live Native</h3>
          {running ? (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              ACTIF · pid {pid ?? "?"}
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300">
              Arrêté
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {!running ? (
            <button
              onClick={handleStart}
              disabled={loading !== null}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-green-50 border border-green-300 text-green-700 hover:bg-green-100 transition disabled:opacity-50"
            >
              {loading === "start" ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Démarrer
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={loading !== null}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-red-50 border border-red-300 text-red-700 hover:bg-red-100 transition disabled:opacity-50"
            >
              {loading === "stop" ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} />}
              Arrêter
            </button>
          )}
          <button
            onClick={() => refresh()}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border text-muted hover:text-text hover:border-blue/40"
            title="Refresh"
          >
            <Activity size={12} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs p-2.5 rounded bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span className="font-mono break-all">{error}</span>
        </div>
      )}

      {livePrice && instrument && (
        <div
          style={{
            backgroundColor: "#FEF3C7",
            border: "2px solid #F59E0B",
            borderRadius: "6px",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#000",
            fontSize: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              💲 Prix live {instrument}
            </span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "18px", color: "#000" }}>
              ${livePrice.price.toFixed(2)}
            </span>
            <span style={{ fontFamily: "monospace", fontSize: "13px", color: livePrice.change_pct >= 0 ? "#15803D" : "#DC2626", fontWeight: 600 }}>
              {livePrice.change_pct >= 0 ? "+" : ""}{livePrice.change_pct.toFixed(2)}%
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {priceHistory.length >= 2 && (() => {
              const w = 140, h = 30;
              const min = Math.min(...priceHistory);
              const max = Math.max(...priceHistory);
              const range = max - min || 1;
              const pts = priceHistory.map((p, i) => {
                const x = (i / (priceHistory.length - 1)) * w;
                const y = h - ((p - min) / range) * h;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(" ");
              const lastDelta = priceHistory[priceHistory.length - 1] - priceHistory[0];
              const lineColor = lastDelta >= 0 ? "#15803D" : "#DC2626";
              return (
                <svg width={w} height={h} style={{ display: "block" }}>
                  <polyline fill="none" stroke={lineColor} strokeWidth="1.5" points={pts} />
                </svg>
              );
            })()}
            <span style={{ fontSize: "11px", color: "#666", fontFamily: "monospace" }}>
              {livePrice.ts ? livePrice.ts.slice(11, 19) : "—"}
            </span>
            <span style={{ fontSize: "10px", color: "#999", fontFamily: "monospace" }}>
              {priceHistory.length}pts
            </span>
          </div>
        </div>
      )}

      {state ? (
        <>
          {/* KPIs Cards */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
            <div className="bg-ink/30 rounded p-2 border border-border/60">
              <div className="text-[10px] text-muted uppercase tracking-wider">Capital fictif</div>
              <div className="text-sm font-semibold font-mono text-text">${state.capital.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="bg-ink/30 rounded p-2 border border-border/60">
              <div className="text-[10px] text-muted uppercase tracking-wider">PnL Live</div>
              <div className={`text-sm font-semibold font-mono ${state.total_pnl >= 0 ? "text-green-700" : "text-red-500"}`}>
                {state.total_pnl >= 0 ? "+" : ""}${state.total_pnl.toFixed(2)}
              </div>
            </div>
            <div className="bg-ink/30 rounded p-2 border border-border/60">
              <div className="text-[10px] text-muted uppercase tracking-wider">Trades Live</div>
              <div className="text-sm font-semibold font-mono text-text">{state.trade_count}</div>
              <div className="text-[9px] text-muted/70">{state.wins}W / {state.losses}L</div>
            </div>
            <div className="bg-ink/30 rounded p-2 border border-border/60">
              <div className="text-[10px] text-muted uppercase tracking-wider">Max Consec W</div>
              <div className="text-sm font-semibold font-mono text-text">{computeStreaks((data?.trades ?? []) as Array<{ pnl?: number | null }>).mcw}</div>
            </div>
            <div className="bg-ink/30 rounded p-2 border border-border/60">
              <div className="text-[10px] text-muted uppercase tracking-wider">Max Consec L</div>
              <div className="text-sm font-semibold font-mono text-text">{computeStreaks((data?.trades ?? []) as Array<{ pnl?: number | null }>).mcl}</div>
            </div>
            <div className="bg-ink/30 rounded p-2 border border-border/60">
              <div className="text-[10px] text-muted uppercase tracking-wider">WR Live</div>
              <div className="text-sm font-semibold font-mono text-text">
                {state.trade_count > 0 ? ((state.wins / state.trade_count) * 100).toFixed(1) + "%" : "—"}
              </div>
            </div>
            <div className="bg-ink/30 rounded p-2 border border-border/60">
              <div className="text-[10px] text-muted uppercase tracking-wider">Position</div>
              <div className={`text-sm font-semibold ${state.in_position ? "text-blue" : "text-muted"}`}>
                {state.in_position ? "🟢 OUVERTE" : "—"}
              </div>
              {state.in_position && state.entry_price && (
                <div className="text-[9px] text-muted/70 font-mono">
                  @ {state.entry_price.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Position détails */}
          {state.in_position && state.entry_price && state.sl && state.tp && (
            <div className="bg-blue/5 border border-blue/30 rounded p-2.5 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={11} className="text-blue" />
                <span className="text-blue font-medium">Position ouverte depuis {state.entry_bar_ts}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                <div><span className="text-muted">Entry :</span> <span className="font-mono">{state.entry_price.toFixed(2)}</span></div>
                <div><span className="text-muted">SL :</span> <span className="font-mono text-red-500">{state.sl.toFixed(2)}</span></div>
                <div><span className="text-muted">TP :</span> <span className="font-mono text-green-700">{state.tp.toFixed(2)}</span></div>
              </div>
            </div>
          )}

          {/* Dernier signal évalué */}
          {state.last_signal_ts && (
            <div className="text-[10px] text-muted">
              Dernier tick évalué : <span className="font-mono">{state.last_signal_ts}</span>
            </div>
          )}

          {/* S62 — Section "5 trades récents" supprimée (redondante avec PaperTradeTable en bas) */}
          {recent.length > 0 ? null : (
            running ? (
              <div className="flex items-start gap-3 p-3 rounded bg-amber-50 border border-amber-200">
                <Clock size={16} className="shrink-0 mt-0.5 text-amber-700" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-amber-900">En attente — Aucun trade aujourd'hui</div>
                  <div className="text-[10px] text-amber-800 mt-1 leading-relaxed">
                    La stratégie évalue le marché à chaque clôture de bougie. Un signal peut prendre des heures ou la journée entière à apparaître selon la volatilité. C'est normal.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 rounded bg-gray-50 border border-gray-200">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-gray-700" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-900">Paper trader arrêté</div>
                  <div className="text-[10px] text-gray-700 mt-1 leading-relaxed">
                    Clique « Démarrer » en haut à droite pour activer la surveillance live.
                  </div>
                </div>
              </div>
            )
          )}
        </>
      ) : (
        <div className="text-[11px] text-muted italic text-center py-3">
          {running ? "Chargement données paper..." : "Paper trader pas encore démarré pour cette stratégie."}
        </div>
      )}
    </div>
  );
}
