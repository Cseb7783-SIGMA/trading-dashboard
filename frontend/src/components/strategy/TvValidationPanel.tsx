"use client";
import { useEffect, useState, type ChangeEvent } from "react";
import { ChevronDown, Check, AlertTriangle } from "lucide-react";
import { fetchTvValidation, saveTvValidation, parseTvCsv, type TvValidationData } from "@/lib/api";

type Row = { key: "pf" | "net_pct" | "max_dd_pct" | "trades"; label: string; suffix: string; tol: number };
const ROWS: Row[] = [
  { key: "pf", label: "Profit Factor", suffix: "", tol: 5 },
  { key: "net_pct", label: "Rendement net", suffix: " %", tol: 5 },
  { key: "max_dd_pct", label: "Max Drawdown", suffix: " %", tol: 8 },
  { key: "trades", label: "Nb trades", suffix: "", tol: 5 },
];

export default function TvValidationPanel({ runId }: { runId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TvValidationData | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || data) return;
    fetchTvValidation(runId)
      .then((d) => {
        setData(d);
        const dr: Record<string, string> = {};
        ROWS.forEach((r) => { const v = (d.tv as any)?.[r.key]; if (v !== undefined && v !== null) dr[r.key] = String(v); });
        setDraft(dr); setNote(d.tv?.note ?? "");
      })
      .catch((e) => setErr(String(e.message || e)));
  }, [open, data, runId]);

  const num = (v: any) => (v === null || v === undefined || v === "" ? null : Number(v));
  const ecart = (eng: number | null, tv: number | null) =>
    eng === null || tv === null || eng === 0 ? null : ((tv - eng) / Math.abs(eng)) * 100;

  async function save() {
    setSaving(true); setMsg(null); setErr(null);
    try {
      const body: any = { note };
      ROWS.forEach((r) => { const v = num(draft[r.key]); if (v !== null) body[r.key] = v; });
      await saveTvValidation(runId, body);
      setMsg("Enregistré ✓"); setData(null); // refetch
    } catch (e: any) { setErr(String(e.message || e)); }
    finally { setSaving(false); setTimeout(() => setMsg(null), 3000); }
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null); setMsg("Lecture du CSV…");
    try {
      const text = await file.text();
      const r = await parseTvCsv(text);
      const d = { ...draft };
      if (r.pf != null) d.pf = String(r.pf);
      if (r.net_pct != null) d.net_pct = String(r.net_pct);
      if (r.max_dd_pct != null) d.max_dd_pct = String(r.max_dd_pct);
      if (r.trades != null) d.trades = String(r.trades);
      setDraft(d);
      setNote(r.note_auto + (r.win_rate != null ? ` WR ${r.win_rate}%.` : ""));
      setMsg("Importé ✓ — vérifie puis Enregistrer");
    } catch (e: any) { setErr(String(e.message || e)); setMsg(null); }
  }

  // verdict global : toutes les métriques saisies dans la tolérance ?
  let allOk = true, anyTv = false;
  if (data) ROWS.forEach((r) => {
    const eng = num((data.engine as any)?.[r.key]); const tv = num(draft[r.key]);
    if (tv !== null) { anyTv = true; const e = ecart(eng, tv); if (e === null || Math.abs(e) > r.tol) allOk = false; }
  });

  return (
    <div className="bg-surface border border-border rounded-lg">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex justify-between items-center px-4 py-3 text-sm font-medium text-muted hover:text-foreground">
        <span className="flex items-center gap-2">
          Validation TradingView (moteur ↔ TV)
          {data && anyTv && (allOk
            ? <span className="text-[11px] px-2 py-0.5 rounded flex items-center gap-1" style={{ background: "#E1F5EE", color: "#085041" }}><Check size={12} /> cohérent</span>
            : <span className="text-[11px] px-2 py-0.5 rounded flex items-center gap-1" style={{ background: "#FCEBEB", color: "#791F1F" }}><AlertTriangle size={12} /> écart</span>)}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <p className="text-[11px] text-muted mb-3">
            Backteste cette stratégie dans TradingView (même période), puis entre les KPIs TV ici. Si l'écart avec le moteur est faible → le backtest est fiable.
          </p>
          <div className="mb-3">
            <label className="text-xs px-3 py-1 rounded border border-border hover:bg-blue/10 text-blue cursor-pointer inline-flex items-center gap-1">
              Importer le rapport TV (CSV)
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onImport} />
            </label>
            <span className="text-[11px] text-muted ml-2">Auto-remplit PF · net % · max DD % · trades depuis la liste de trades TV.</span>
          </div>
          {err && <div className="text-xs text-red-500 mb-2">Erreur : {err}</div>}
          {!data && !err && <div className="text-xs text-muted">Chargement…</div>}
          {data && (
            <>
              <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 text-[12px]">
                <div className="text-muted font-medium">Métrique</div>
                <div className="text-muted font-medium">Moteur</div>
                <div className="text-muted font-medium">TradingView</div>
                <div className="text-muted font-medium text-right">Écart</div>
                {ROWS.map((r) => {
                  const eng = num((data.engine as any)?.[r.key]);
                  const tv = num(draft[r.key]);
                  const e = ecart(eng, tv);
                  const okColor = e === null ? "#888780" : Math.abs(e) <= r.tol ? "#15803D" : "#DC2626";
                  return (
                    <div key={r.key} className="contents">
                      <div className="py-1.5">{r.label}</div>
                      <div className="py-1.5 font-medium">{eng === null ? "—" : eng.toFixed(r.key === "trades" ? 0 : 2)}{r.suffix}</div>
                      <div className="py-1">
                        <input value={draft[r.key] ?? ""} onChange={(ev) => setDraft({ ...draft, [r.key]: ev.target.value })}
                          inputMode="decimal" placeholder="—"
                          className="w-full text-[12px] rounded px-2 py-1 bg-surface-hover border border-border" />
                      </div>
                      <div className="py-1.5 text-right font-medium" style={{ color: okColor }}>
                        {e === null ? "—" : `${e >= 0 ? "+" : ""}${e.toFixed(1)}%`}
                      </div>
                    </div>
                  );
                })}
              </div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note (période testée, écarts observés…)"
                className="w-full text-[12px] rounded p-2 mt-3 bg-surface-hover border border-border" />
              <div className="flex items-center gap-2 mt-2">
                <button onClick={save} disabled={saving} className="text-xs px-3 py-1 rounded border border-border hover:bg-blue/10 text-blue">{saving ? "…" : "Enregistrer la validation TV"}</button>
                {msg && <span className="text-[11px] text-muted">{msg}</span>}
                {data.tv?.verified_at && <span className="text-[11px] text-muted ml-auto">dernière vérif : {String(data.tv.verified_at).slice(0, 16)}</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
