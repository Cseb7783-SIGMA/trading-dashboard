"use client";
import { useEffect, useState } from "react";
import { Lightbulb, Clock, Coins, CircleCheck, Play, Star } from "lucide-react";
import { fetchDiscoveries, activateRun, paperTraderStart, type Discovery } from "@/lib/api";

const STAGE: Record<string, { label: string; bg: string; fg: string; Icon: any }> = {
  rd:          { label: "Hypothèse", bg: "#FAEEDA", fg: "#633806", Icon: Lightbulb },
  paper:       { label: "En paper",  bg: "#E6F1FB", fg: "#0C447C", Icon: Clock },
  broker:      { label: "Live",      bg: "#EEEDFE", fg: "#3C3489", Icon: Coins },
  propfirm:    { label: "Live",      bg: "#EEEDFE", fg: "#3C3489", Icon: Coins },
  challenge_z: { label: "Live",      bg: "#EEEDFE", fg: "#3C3489", Icon: Coins },
};

// Remplit les critères = vrai edge + assez d'échantillon (le Risk-Score sert au tri).
const meetsCriteria = (d: Discovery) => (d.pf ?? 0) >= 1.4 && (d.trades ?? 0) >= 50;

function StageBadge({ stage }: { stage: string }) {
  const s = STAGE[stage] || STAGE.rd;
  const I = s.Icon;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded" style={{ background: s.bg, color: s.fg }}>
      <I size={12} /> {s.label}
    </span>
  );
}

export default function DiscoveriesSection() {
  const [items, setItems] = useState<Discovery[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { fetchDiscoveries().then((d) => setItems(d.discoveries)).catch((e) => setErr(e.message)); }, []);

  async function launchPaper(d: Discovery) {
    setBusy(d.run_id); setErr(null); setMsg(null);
    try {
      await activateRun(d.run_id, "paper");
      await paperTraderStart(d.run_id);
      setItems((prev) => prev?.map((x) => (x.run_id === d.run_id ? { ...x, stage: "paper" } : x)) ?? prev);
      setMsg(`${d.strategy} → lancée en paper ✓`);
    } catch (e: any) { setErr(`Échec lancement paper : ${String(e.message || e)}`); }
    finally { setBusy(null); setTimeout(() => setMsg(null), 4000); }
  }

  if (err) return <div className="text-xs text-red-500">Erreur : {err}</div>;
  if (!items) return <div className="text-xs text-muted">Chargement…</div>;
  if (items.length === 0) return <div className="text-xs text-muted">Aucune découverte pour l'instant — le scanner ajoutera ses trouvailles ici chaque nuit.</div>;

  const byScore = (a: Discovery, b: Discovery) =>
    ((b.risk_score ?? -1) - (a.risk_score ?? -1)) || ((b.pf ?? -1) - (a.pf ?? -1));
  const top = items.filter(meetsCriteria).sort(byScore);
  const others = items.filter((d) => !meetsCriteria(d)).sort(byScore);

  const row = (d: Discovery, hot: boolean) => (
    <tr key={d.run_id} className="border-t border-border" style={hot ? { background: "rgba(59,109,17,0.06)" } : undefined}>
      <td className="px-2 py-2 whitespace-nowrap">
        {hot && <Star size={13} className="inline mr-1" style={{ color: "#3B6D11" }} fill="#3B6D11" />}
        <StageBadge stage={d.stage} />
      </td>
      <td className="px-2 py-2">
        <span className="font-medium">{d.strategy}</span>
        <div className="text-[11px] text-muted">{d.instrument} · {d.timeframe}{d.regime ? ` · régime ${d.regime}` : ""} · in-sample</div>
      </td>
      <td className="text-right px-2 py-2" style={{ color: (d.pf ?? 0) >= 1.4 ? "#15803D" : undefined }}>{d.pf != null ? d.pf.toFixed(2) : "—"}</td>
      <td className="text-right px-2 py-2">{d.trades ?? "—"}</td>
      <td className="text-right px-2 py-2" style={{ color: "#185FA5" }}>{d.risk_score != null ? d.risk_score.toFixed(2) : "—"}</td>
      <td className="text-right px-2 py-2">
        {d.stage === "paper" ? (
          <span className="text-[11px] text-muted inline-flex items-center gap-1"><CircleCheck size={12} /> en paper</span>
        ) : (
          <button onClick={() => launchPaper(d)} disabled={busy === d.run_id}
            className="text-xs px-3 py-1 rounded border border-border hover:bg-blue/10 text-blue inline-flex items-center gap-1 whitespace-nowrap">
            <Play size={12} /> {busy === d.run_id ? "…" : "Lancer en paper"}
          </button>
        )}
      </td>
    </tr>
  );

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted">
        Trouvées sur données passées. <strong>Non validées — ce ne sont pas des gagnants.</strong> Les ★ <strong>remplissent les critères</strong> (PF ≥ 1.4 · ≥ 50 trades) et sont classées par Risk-Score — ce sont les meilleures à lancer en paper.
      </p>
      {msg && <div className="text-[11px] text-green-600">{msg}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[12px] text-muted">
              <th className="text-left px-2 py-2 font-medium">Statut</th>
              <th className="text-left px-2 py-2 font-medium">Stratégie · actif · régime</th>
              <th className="text-right px-2 py-2 font-medium">PF</th>
              <th className="text-right px-2 py-2 font-medium">Trades</th>
              <th className="text-right px-2 py-2 font-medium">Risk-Score</th>
              <th className="text-right px-2 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {top.length > 0 && (
              <tr><td colSpan={6} className="px-2 pt-2 pb-1 text-[11px] font-medium" style={{ color: "#3B6D11" }}>★ Remplissent les critères ({top.length}) — à considérer pour le paper</td></tr>
            )}
            {top.map((d) => row(d, true))}
            {others.length > 0 && (
              <tr><td colSpan={6} className="px-2 pt-3 pb-1 text-[11px] text-muted border-t border-border">Autres hypothèses ({others.length}) — ne remplissent pas les critères</td></tr>
            )}
            {others.map((d) => row(d, false))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
