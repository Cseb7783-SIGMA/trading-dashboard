"use client";
import { useEffect, useState } from "react";
import DeskAgentChart from "./DeskAgentChart";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

type Review = {
  result?: string | null; pnl_usd?: number | null; pnl_pct?: number | null;
  r_realized?: number | null; cumulative_usd?: number | null;
  plan_respected?: boolean | null; lesson?: string | null; sebast_comment?: string | null;
};
type TopDown = { bias?: string; h4?: string; h1?: string; m15?: string };
type Call = {
  id: string; datetime: string; asset: string; direction: string; strategy: string;
  run_id: string | null; entry_tf: string; topdown: TopDown; reason: string; trigger?: string | null;
  entry: number; sl: number; sl_rule: string; tp: number; tp_rule: string;
  risk_pct: number; rr_target: number; status: string;
  entry_ts: string | null; exit_ts: string | null; review: Review;
};

const TV_SYMBOL: Record<string, string> = {
  QQQ: "NASDAQ:QQQ", SPY: "AMEX:SPY", IWM: "AMEX:IWM", DIA: "AMEX:DIA",
  ES: "CME_MINI:ES1!", NQ: "CME_MINI:NQ1!", YM: "CBOT_MINI:YM1!", RTY: "CME_MINI:RTY1!",
  GC: "COMEX:GC1!", CL: "NYMEX:CL1!", BTC: "BINANCE:BTCUSDT", BTCUSD: "BINANCE:BTCUSDT",
};
const TV_INTERVAL: Record<string, string> = { "1m": "1", "2m": "2", "3m": "3", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1d": "D" };
function tvUrl(asset: string, tf: string): string {
  const s = TV_SYMBOL[(asset || "").toUpperCase()] || asset;
  const i = TV_INTERVAL[tf] || "15";
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(s)}&interval=${i}`;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-sm text-text">{value}</div>
    </div>
  );
}

export default function DeskAgentTab() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/desk-agent/calls`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCalls(d.calls || []))
      .catch(() => setCalls([]))
      .finally(() => setLoading(false));
  }, []);

  const sel = calls.find((c) => c.id === selId) || null;

  useEffect(() => { setCommentDraft(sel?.review?.sebast_comment || ""); setSavedMsg(null); }, [sel?.id]);

  async function saveComment() {
    if (!sel) return;
    setSavingComment(true); setSavedMsg(null);
    try {
      const r = await fetch(`${BASE}/desk-agent/calls/${encodeURIComponent(sel.id)}/comment`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment: commentDraft }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setCalls((prev) => prev.map((c) => (c.id === sel.id ? { ...c, review: { ...c.review, sebast_comment: commentDraft } } : c)));
      setSavedMsg("Enregistré ✓");
    } catch (e) { setSavedMsg("Erreur d'enregistrement"); }
    finally { setSavingComment(false); setTimeout(() => setSavedMsg(null), 3000); }
  }

  if (loading) return <div className="bg-surface border border-border rounded-lg p-8 text-center text-xs text-muted">Chargement du Desk Agent…</div>;
  if (!calls.length) return <div className="bg-surface border border-border border-dashed rounded-lg p-8 text-center text-xs text-muted">Aucun call du Desk Agent pour l'instant. L'agent loguera ses décisions ici (mode : il décide → on révise).</div>;

  const closed = calls.filter((c) => c.status === "closed" && c.review);
  const wins = closed.filter((c) => c.review.result === "win").length;
  const totalPnl = closed.reduce((s, c) => s + (c.review.pnl_usd || 0), 0);
  const planOk = closed.filter((c) => c.review.plan_respected === true).length;
  const rVals = closed.map((c) => c.review.r_realized).filter((v): v is number => typeof v === "number");
  const rAvg = rVals.length ? rVals.reduce((a, b) => a + b, 0) / rVals.length : null;

  // Séries consécutives max (ConsW / ConsL) — trades clôturés, ordre chronologique
  const chrono = [...closed].sort((a, b) =>
    String(a.entry_ts || a.datetime || "").localeCompare(String(b.entry_ts || b.datetime || "")));
  let maxConsW = 0, maxConsL = 0, curW = 0, curL = 0;
  for (const c of chrono) {
    const res = c.review?.result;
    if (res === "win") { curW++; curL = 0; if (curW > maxConsW) maxConsW = curW; }
    else if (res === "loss") { curL++; curW = 0; if (curL > maxConsL) maxConsL = curL; }
    else { curW = 0; curL = 0; }
  }

  // Perf par stratégie × actif (regroupe les calls clôturés)
  const fmtUsd = (v: number) => (v >= 0 ? "+" : "−") + "$" + Math.abs(Math.round(v));
  const _groups: Record<string, { strategy: string; asset: string; tf: string; chrono: Call[] }> = {};
  for (const c of closed) {
    const key = `${c.strategy}|${c.asset}`;
    if (!_groups[key]) _groups[key] = { strategy: c.strategy, asset: c.asset, tf: c.entry_tf, chrono: [] };
    _groups[key].chrono.push(c);
  }
  const perStrat = Object.values(_groups).map((g) => {
    const ch = [...g.chrono].sort((a, b) =>
      String(a.entry_ts || a.datetime || "").localeCompare(String(b.entry_ts || b.datetime || "")));
    const n = ch.length;
    const pnl = ch.reduce((s, c) => s + (c.review.pnl_usd || 0), 0);
    const w = ch.filter((c) => c.review.result === "win").length;
    const pOk = ch.filter((c) => c.review.plan_respected === true).length;
    const rs = ch.map((c) => c.review.r_realized).filter((v): v is number => typeof v === "number");
    let mW = 0, mL = 0, cW = 0, cL = 0;
    for (const c of ch) {
      const r = c.review?.result;
      if (r === "win") { cW++; cL = 0; if (cW > mW) mW = cW; }
      else if (r === "loss") { cL++; cW = 0; if (cL > mL) mL = cL; }
      else { cW = 0; cL = 0; }
    }
    return {
      strategy: g.strategy, asset: g.asset, tf: g.tf, n, pnl,
      wr: n ? (w / n) * 100 : 0,
      rAvg: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
      plan: n ? (pOk / n) * 100 : 0, consW: mW, consL: mL,
    };
  }).sort((a, b) => b.pnl - a.pnl);

  const metric = (label: string, value: string, accent?: boolean) => (
    <div className={`rounded-md px-4 py-3 ${accent ? "bg-blue/10" : "bg-surface"}`}>
      <div className="text-[13px] text-muted mb-1">{label}</div>
      <div className="text-xl font-medium text-text">{value}</div>
    </div>
  );

  const dirBadge = (dir: string) => {
    const short = (dir || "").toLowerCase() === "short";
    return <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: short ? "#FCEBEB" : "#EAF3DE", color: short ? "#791F1F" : "#27500A" }}>{short ? "Short" : "Long"}</span>;
  };

  const detailBlock = (c: Call) => (
    <div className="bg-surface border border-blue/40 rounded-lg p-4 mt-1.5 mb-1">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-sm font-medium text-text">{c.asset}</span>
        {dirBadge(c.direction)}
        <span className="text-[13px] text-muted">{c.strategy} · {c.entry_tf}</span>
        <a href={tvUrl(c.asset, c.entry_tf)} target="_blank" rel="noopener noreferrer"
          className="text-[11px] px-2 py-0.5 rounded border border-border hover:bg-blue/10 text-blue">Ouvrir dans TradingView ↗</a>
        <span className="ml-auto text-[11px] px-2 py-0.5 rounded" style={{ background: "#E1F5EE", color: "#085041" }}>
          {c.status === "closed" ? "Clos" : "En cours"}
          {c.status === "closed" && c.review?.pnl_usd != null ? ` · ${c.review.pnl_usd >= 0 ? "+" : ""}$${Math.round(c.review.pnl_usd)}` : ""}
        </span>
      </div>

      <DeskAgentChart callId={c.id} />

      <div className="grid md:grid-cols-2 gap-5 border-t border-border pt-4 mt-3">
        <div>
          <div className="text-[13px] font-medium text-muted mb-2">Plan — avant le trade</div>
          <Field label="Top-down" value={`${c.topdown?.bias ?? "—"} — 4h ${c.topdown?.h4 ?? "—"} · 1h ${c.topdown?.h1 ?? "—"} · 15m ${c.topdown?.m15 ?? "—"}`} />
          {c.trigger ? <Field label="Trigger (déclencheur de la stratégie)" value={<span className="text-sm font-semibold" style={{ color: "#185FA5" }}>{c.trigger}</span>} /> : null}
          <Field label="TF d'entrée · raison" value={`${c.entry_tf} — ${c.reason}`} />
          <Field label="Entrée · SL" value={`${c.entry} · SL ${c.sl} (${c.sl_rule})`} />
          <Field label="TP · risque" value={`${c.tp} — ${c.tp_rule} · risque ${c.risk_pct}% · RR visé ${c.rr_target}:1`} />
        </div>
        <div>
          <div className="text-[13px] font-medium text-muted mb-2">Revue — après le trade</div>
          {c.status === "closed" ? (
            <>
              <Field label="Résultat" value={<span style={{ color: c.review.result === "win" ? "#15803D" : "#DC2626", fontWeight: 500 }}>{c.review.result === "win" ? "Gain" : "Perte"}{c.review.pnl_usd != null ? ` · ${c.review.pnl_usd >= 0 ? "+" : ""}$${Math.round(c.review.pnl_usd)}` : ""}{c.review.r_realized != null ? ` (${c.review.r_realized >= 0 ? "+" : ""}${c.review.r_realized}R)` : ""}</span>} />
              <Field label="Plan respecté ?" value={c.review.plan_respected == null ? "—" : c.review.plan_respected ? "Oui" : "Non"} />
              <Field label="Leçon (agent)" value={c.review.lesson || "—"} />
            </>
          ) : (
            <div className="text-sm text-muted mb-3">Position ouverte — revue à remplir une fois clôturée.</div>
          )}
          <div className="rounded-md p-2.5 mt-1" style={{ background: "#E6F1FB", border: "1px solid #85B7EB" }}>
            <div className="text-[11px] mb-1" style={{ color: "#185FA5" }}>Commentaire de Sebast</div>
            <textarea value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} rows={3}
              placeholder="Écris ta revue de mon exécution…"
              className="w-full text-sm rounded p-2" style={{ border: "1px solid #85B7EB", background: "#fff", color: "#0C447C" }} />
            <div className="flex items-center gap-2 mt-1">
              <button onClick={saveComment} disabled={savingComment}
                className="text-xs px-3 py-1 rounded border border-border hover:bg-surface">{savingComment ? "…" : "Enregistrer"}</button>
              {savedMsg && <span className="text-[11px] text-muted">{savedMsg}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {metric("Total PnL", (totalPnl >= 0 ? "+" : "") + "$" + totalPnl.toFixed(2))}
        {metric("Trades gagnants", closed.length ? Math.round((wins / closed.length) * 100) + "%" : "—")}
        {metric("Plan respecté", closed.length ? Math.round((planOk / closed.length) * 100) + "%" : "—", true)}
        {metric("R moyen", rAvg !== null ? (rAvg >= 0 ? "+" : "") + rAvg.toFixed(1) + "R" : "—", true)}
        {metric("ConsW", String(maxConsW))}
        {metric("ConsL", String(maxConsL))}
      </div>

      {perStrat.length > 0 && (
        <div>
          <div className="text-[13px] font-medium text-muted mb-2">Performance par stratégie appliquée</div>
          <div className="bg-surface border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[12px] text-muted">
                  <th className="text-left px-3 py-2 font-medium">Stratégie (utilisations)</th>
                  <th className="text-right px-2 py-2 font-medium">PnL total</th>
                  <th className="text-right px-2 py-2 font-medium">WR</th>
                  <th className="text-right px-2 py-2 font-medium">R moyen</th>
                  <th className="text-right px-2 py-2 font-medium">Plan</th>
                  <th className="text-right px-2 py-2 font-medium">ConsW</th>
                  <th className="text-right px-3 py-2 font-medium">ConsL</th>
                </tr>
              </thead>
              <tbody>
                {perStrat.map((g) => (
                  <tr key={g.strategy + "|" + g.asset} className="border-t border-border">
                    <td className="px-3 py-2">
                      <span className="text-text">{g.strategy} <span className="text-muted">({g.n})</span></span>
                      <div className="text-[11px] text-muted">{g.asset} · {g.tf}</div>
                    </td>
                    <td className="text-right px-2 py-2 font-medium" style={{ color: g.pnl >= 0 ? "#15803D" : "#DC2626" }}>{fmtUsd(g.pnl)}</td>
                    <td className="text-right px-2 py-2" style={{ color: g.wr >= 50 ? undefined : "#DC2626" }}>{Math.round(g.wr)}%</td>
                    <td className="text-right px-2 py-2" style={{ color: g.rAvg == null ? undefined : g.rAvg >= 0 ? "#15803D" : "#DC2626" }}>{g.rAvg == null ? "—" : (g.rAvg >= 0 ? "+" : "") + g.rAvg.toFixed(1) + "R"}</td>
                    <td className="text-right px-2 py-2">{Math.round(g.plan)}%</td>
                    <td className="text-right px-2 py-2">{g.consW}</td>
                    <td className="text-right px-3 py-2">{g.consL}</td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-surface-hover font-medium">
                  <td className="px-3 py-2">Total <span className="text-muted">({closed.length})</span></td>
                  <td className="text-right px-2 py-2" style={{ color: totalPnl >= 0 ? "#15803D" : "#DC2626" }}>{fmtUsd(totalPnl)}</td>
                  <td className="text-right px-2 py-2">{closed.length ? Math.round((wins / closed.length) * 100) : 0}%</td>
                  <td className="text-right px-2 py-2">{rAvg !== null ? (rAvg >= 0 ? "+" : "") + rAvg.toFixed(1) + "R" : "—"}</td>
                  <td className="text-right px-2 py-2">{closed.length ? Math.round((planOk / closed.length) * 100) : 0}%</td>
                  <td className="text-right px-2 py-2">{maxConsW}</td>
                  <td className="text-right px-3 py-2">{maxConsL}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <div className="text-[13px] font-medium text-muted mb-2">Calls ({calls.length})</div>
        <div className="space-y-1.5">
          {[...calls].reverse().map((c) => {
            const isSel = c.id === selId;
            const win = c.review?.result === "win";
            const loss = c.review?.result === "loss";
            return (
              <div key={c.id}>
                <button onClick={() => setSelId(isSel ? null : c.id)}
                  className={`w-full flex items-center gap-3 text-left rounded-md px-3 py-2 border ${isSel ? "border-blue border-2" : "border-border"} bg-surface hover:border-blue/50 transition-colors`}>
                  <span className="text-sm font-medium text-text w-12">{c.asset}</span>
                  {dirBadge(c.direction)}
                  <span className="text-[13px] text-muted truncate">{c.strategy}</span>
                  <span className="ml-auto text-sm font-medium" style={{ color: win ? "#15803D" : loss ? "#DC2626" : "#888780" }}>
                    {c.status === "closed" && c.review?.pnl_usd != null ? (c.review.pnl_usd >= 0 ? "+" : "") + "$" + Math.round(c.review.pnl_usd) : "—"}
                  </span>
                  <span className="text-[11px] text-muted w-28 text-right">{fmtTime(c.datetime)} · {c.status === "closed" ? "Clos" : "En cours"}</span>
                </button>
                {isSel && detailBlock(c)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
