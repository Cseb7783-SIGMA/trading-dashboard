"use client";
import { useEffect, useRef, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

type Review = {
  result?: string | null; pnl_usd?: number | null; pnl_pct?: number | null;
  r_realized?: number | null; cumulative_usd?: number | null;
  plan_respected?: boolean | null; lesson?: string | null; sebast_comment?: string | null;
};
type TopDown = { bias?: string; h4?: string; h1?: string; m15?: string };
type Call = {
  id: string; datetime: string; asset: string; direction: string; strategy: string;
  run_id: string | null; entry_tf: string; topdown: TopDown; reason: string;
  entry: number; sl: number; sl_rule: string; tp: number; tp_rule: string;
  risk_pct: number; rr_target: number; status: string;
  entry_ts: string | null; exit_ts: string | null; review: Review;
};

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

// Chart schématique : zone verte (entrée→TP) + zone rouge (entrée→SL) façon position tool.
// Slice 1 = schéma basé sur les niveaux du call. Slice 2 = vrais OHLC (endpoint dédié).
function DeskChart({ call }: { call: Call }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const isShort = call.direction.toLowerCase() === "short";
    const lo = Math.min(call.entry, call.sl, call.tp);
    const hi = Math.max(call.entry, call.sl, call.tp);
    const padP = (hi - lo) * 0.35 || 1;
    const pmin = lo - padP, pmax = hi + padP;
    const padX = 30, rpad = 14;
    const Y = (p: number) => H - 22 - ((p - pmin) / (pmax - pmin)) * (H - 40);
    const N = 42;
    const cl: number[] = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      // drift de l'entrée vers le TP (trade qui travaille)
      const base = call.entry + (call.tp - call.entry) * Math.min(1, t * 1.15);
      cl.push(base + Math.sin(i * 1.7) * padP * 0.06);
    }
    const cw = (W - padX - rpad) / N;
    const X = (i: number) => padX + i * cw + cw / 2;
    const ei = 6, xi = N - 8;
    // zone risque (entrée → SL) en rouge
    ctx.fillStyle = "rgba(226,75,74,0.20)";
    ctx.fillRect(X(ei), Y(call.entry), X(xi) - X(ei), Y(call.sl) - Y(call.entry));
    ctx.strokeStyle = "#E24B4A"; ctx.lineWidth = 1;
    ctx.strokeRect(X(ei), Y(call.entry), X(xi) - X(ei), Y(call.sl) - Y(call.entry));
    // zone gain (entrée → TP) en vert
    ctx.fillStyle = "rgba(99,153,34,0.18)";
    ctx.fillRect(X(ei), Y(call.entry), X(xi) - X(ei), Y(call.tp) - Y(call.entry));
    ctx.strokeStyle = "#639922"; ctx.lineWidth = 1;
    ctx.strokeRect(X(ei), Y(call.entry), X(xi) - X(ei), Y(call.tp) - Y(call.entry));
    // niveaux pointillés
    ctx.setLineDash([4, 4]);
    const dline = (p: number, c: string) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(padX, Y(p)); ctx.lineTo(W - rpad, Y(p)); ctx.stroke(); };
    dline(call.entry, "#888780"); dline(call.sl, "#E24B4A"); dline(call.tp, "#639922");
    ctx.setLineDash([]);
    // bougies
    for (let i = 1; i < N; i++) {
      const o = cl[i - 1], c = cl[i];
      const h = Math.max(o, c) + Math.abs(Math.sin(i * 0.9)) * padP * 0.05 + padP * 0.02;
      const l = Math.min(o, c) - Math.abs(Math.cos(i * 1.3)) * padP * 0.05 - padP * 0.02;
      const up = c >= o; ctx.strokeStyle = ctx.fillStyle = up ? "#1D9E75" : "#E24B4A";
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(i), Y(h)); ctx.lineTo(X(i), Y(l)); ctx.stroke();
      const bw = Math.max(cw * 0.6, 2), yo = Y(o), yc = Y(c);
      ctx.fillRect(X(i) - bw / 2, Math.min(yo, yc), bw, Math.max(Math.abs(yc - yo), 1));
    }
    // EMA simple
    const ema = (p: number[], per: number) => { const k = 2 / (per + 1); let prev = p[0]; return p.map((v, i) => (prev = i ? v * k + prev * (1 - k) : v)); };
    const line = (e: number[], c: string) => { ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.beginPath(); e.forEach((v, i) => { const x = X(i), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); };
    line(ema(cl, 5), "#378ADD"); line(ema(cl, 20), "#A32D2D");
    void isShort;
  }, [call]);
  return <canvas ref={ref} width={640} height={240} className="w-full h-auto" />;
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

  useEffect(() => {
    fetch(`${BASE}/desk-agent/calls`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { const cs: Call[] = d.calls || []; setCalls(cs); if (cs.length) setSelId(cs[cs.length - 1].id); })
      .catch(() => setCalls([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="bg-surface border border-border rounded-lg p-8 text-center text-xs text-muted">Chargement du Desk Agent…</div>;
  if (!calls.length) return <div className="bg-surface border border-border border-dashed rounded-lg p-8 text-center text-xs text-muted">Aucun call du Desk Agent pour l'instant. L'agent loguera ses décisions ici (mode : il décide → on révise).</div>;

  const closed = calls.filter((c) => c.status === "closed" && c.review);
  const wins = closed.filter((c) => c.review.result === "win").length;
  const totalPnl = closed.reduce((s, c) => s + (c.review.pnl_usd || 0), 0);
  const planOk = closed.filter((c) => c.review.plan_respected === true).length;
  const rVals = closed.map((c) => c.review.r_realized).filter((v): v is number => typeof v === "number");
  const rAvg = rVals.length ? rVals.reduce((a, b) => a + b, 0) / rVals.length : null;
  const sel = calls.find((c) => c.id === selId) || calls[calls.length - 1];

  const metric = (label: string, value: string, accent?: boolean) => (
    <div className={`rounded-md px-4 py-3 ${accent ? "bg-blue/10" : "bg-surface"}`}>
      <div className="text-[13px] text-muted mb-1">{label}</div>
      <div className="text-xl font-medium text-text">{value}</div>
    </div>
  );

  const dirBadge = (dir: string) => {
    const short = dir.toLowerCase() === "short";
    return <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: short ? "#FCEBEB" : "#EAF3DE", color: short ? "#791F1F" : "#27500A" }}>{short ? "Short" : "Long"}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metric("Total PnL", (totalPnl >= 0 ? "+" : "") + "$" + totalPnl.toFixed(2))}
        {metric("Trades gagnants", closed.length ? Math.round((wins / closed.length) * 100) + "%" : "—")}
        {metric("Plan respecté", closed.length ? Math.round((planOk / closed.length) * 100) + "%" : "—", true)}
        {metric("R moyen", rAvg !== null ? (rAvg >= 0 ? "+" : "") + rAvg.toFixed(1) + "R" : "—", true)}
      </div>

      <div>
        <div className="text-[13px] font-medium text-muted mb-2">Calls ({calls.length})</div>
        <div className="space-y-1.5">
          {[...calls].reverse().map((c) => {
            const isSel = c.id === sel.id;
            const win = c.review?.result === "win";
            const loss = c.review?.result === "loss";
            return (
              <button key={c.id} onClick={() => setSelId(c.id)}
                className={`w-full flex items-center gap-3 text-left rounded-md px-3 py-2 border ${isSel ? "border-blue border-2" : "border-border"} bg-surface hover:border-blue/50 transition-colors`}>
                <span className="text-sm font-medium text-text w-12">{c.asset}</span>
                {dirBadge(c.direction)}
                <span className="text-[13px] text-muted truncate">{c.strategy}</span>
                <span className="ml-auto text-sm font-medium" style={{ color: win ? "#1D9E75" : loss ? "#E24B4A" : "var(--muted, #888)" }}>
                  {c.status === "closed" && c.review?.pnl_usd != null ? (c.review.pnl_usd >= 0 ? "+" : "") + "$" + Math.round(c.review.pnl_usd) : "—"}
                </span>
                <span className="text-[11px] text-muted w-28 text-right">{fmtTime(c.datetime)} · {c.status === "closed" ? "Clos" : "En cours"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-sm font-medium text-text">{sel.asset}</span>
          {dirBadge(sel.direction)}
          <span className="text-[13px] text-muted">{sel.strategy} · {sel.entry_tf}</span>
          <span className="ml-auto text-[11px] px-2 py-0.5 rounded" style={{ background: "#E1F5EE", color: "#085041" }}>
            {sel.status === "closed" ? "Clos" : "En cours"}
            {sel.status === "closed" && sel.review?.pnl_usd != null ? ` · ${sel.review.pnl_usd >= 0 ? "+" : ""}$${Math.round(sel.review.pnl_usd)}` : ""}
          </span>
        </div>

        <DeskChart call={sel} />
        <div className="flex gap-4 flex-wrap text-[11px] text-muted mt-1 mb-4">
          <span><span className="inline-block w-3 h-2.5 align-middle mr-1" style={{ background: "rgba(99,153,34,0.25)", border: "1px solid #639922" }} />zone de gain (→ TP)</span>
          <span><span className="inline-block w-3 h-2.5 align-middle mr-1" style={{ background: "rgba(226,75,74,0.22)", border: "1px solid #E24B4A" }} />zone de risque (→ SL)</span>
          <span className="italic">schéma (vrais OHLC : prochaine itération)</span>
        </div>

        <div className="grid md:grid-cols-2 gap-5 border-t border-border pt-4">
          <div>
            <div className="text-[13px] font-medium text-muted mb-2">Plan — avant le trade</div>
            <Field label="Top-down" value={`${sel.topdown?.bias ?? "—"} — 4h ${sel.topdown?.h4 ?? "—"} · 1h ${sel.topdown?.h1 ?? "—"} · 15m ${sel.topdown?.m15 ?? "—"}`} />
            <Field label="TF d'entrée · raison" value={`${sel.entry_tf} — ${sel.reason}`} />
            <Field label="Entrée · SL" value={`${sel.entry} · SL ${sel.sl} (${sel.sl_rule})`} />
            <Field label="TP · risque" value={`${sel.tp} — ${sel.tp_rule} · risque ${sel.risk_pct}% · RR visé ${sel.rr_target}:1`} />
          </div>
          <div>
            <div className="text-[13px] font-medium text-muted mb-2">Revue — après le trade</div>
            {sel.status === "closed" ? (
              <>
                <Field label="Résultat" value={<span style={{ color: sel.review.result === "win" ? "#1D9E75" : "#E24B4A", fontWeight: 500 }}>{sel.review.result === "win" ? "Gain" : "Perte"}{sel.review.pnl_usd != null ? ` · ${sel.review.pnl_usd >= 0 ? "+" : ""}$${Math.round(sel.review.pnl_usd)}` : ""}{sel.review.r_realized != null ? ` (${sel.review.r_realized >= 0 ? "+" : ""}${sel.review.r_realized}R)` : ""}</span>} />
                <Field label="Plan respecté ?" value={sel.review.plan_respected == null ? "—" : sel.review.plan_respected ? "Oui" : "Non"} />
                <Field label="Leçon (agent)" value={sel.review.lesson || "—"} />
              </>
            ) : (
              <div className="text-sm text-muted mb-3">Position ouverte — revue à remplir une fois clôturée.</div>
            )}
            <div className="rounded-md p-2.5 mt-1" style={{ background: "var(--blue-bg, #E6F1FB)", border: "1px solid #85B7EB" }}>
              <div className="text-[11px] mb-0.5" style={{ color: "#185FA5" }}>Commentaire de Sebast</div>
              <div className="text-sm" style={{ color: sel.review?.sebast_comment ? "#0C447C" : "#888780" }}>{sel.review?.sebast_comment || "À remplir lors de la revue"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
