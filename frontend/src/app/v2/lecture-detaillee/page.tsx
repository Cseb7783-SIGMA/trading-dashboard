"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, ExternalLink, Newspaper } from "lucide-react";
import {
  parseRegimeDistribution, parseVolatility, parseTrackedAssets, regimeConsensus, parsePerAsset,
  type RegimeDistribution, type Volatility, type TrackedAssets, type Consensus, type AssetRow,
} from "./lecture_detail_utils";

// V2 — Lecture détaillée. Zone INDEPENDANTE, LECTURE SEULE.
// Source produit STABLE unique : latest.md (bloc « Lecture par actif », timeframe quotidien 1D). Aucun backend, aucun TF inventé.
const OWNER = "Cseb7783-SIGMA";
const REPO = "sigma-reports";
const LATEST = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/latest.md`;
const SOURCE_LINK = `https://github.com/${OWNER}/${REPO}/blob/main/latest.md`;

function pct(n: number) { return `${Math.round(n * 100)}%`; }

function dirClass(d: string | null) {
  if (d === "haussier") return "text-green";
  if (d === "baissier") return "text-red";
  return "text-muted";
}
function volClass(v: string | null) {
  if (v === "élevée") return "bg-orange/15 text-orange";
  if (v === "normale") return "bg-muted/15 text-muted";
  return "bg-muted/10 text-muted/60";
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function V2LectureDetailleePage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [date, setDate] = useState<string | null>(null);
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [dist, setDist] = useState<RegimeDistribution | null>(null);
  const [vol, setVol] = useState<Volatility | null>(null);
  const [assets, setAssets] = useState<TrackedAssets | null>(null);
  const [cons, setCons] = useState<Consensus | null>(null);

  useEffect(() => {
    (async () => {
      setStatus("loading");
      try {
        const r = await fetch(`${LATEST}?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) throw new Error();
        const md = await r.text();
        if (!md || !md.trim()) throw new Error();
        const m = md.match(/(\d{4}-\d{2}-\d{2})/);
        setDate(m ? m[1] : null);
        setRows(parsePerAsset(md));
        const d = parseRegimeDistribution(md);
        setDist(d);
        setVol(parseVolatility(md));
        setAssets(parseTrackedAssets(md));
        setCons(regimeConsensus(d));
        setStatus("ok");
      } catch { setStatus("error"); }
    })();
  }, []);

  const maxCount = dist ? Math.max(1, ...dist.buckets.map((b) => b.count)) : 1;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue/20 text-blue uppercase">V2 · Prototype</span>
          <LayoutGrid size={16} className="text-blue" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-text">Lecture détaillée par actif</h1>
        <p className="text-xs text-muted mt-1">
          Statut : observation seulement, rien de confirmé, pas un conseil. Lecture <span className="text-text">quotidienne (1D)</span> par actif,
          telle que publiée dans l'artefact public{date ? ` du ${date}` : ""}. Champs réellement absents affichés <span className="text-text">n/d</span>.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted flex-wrap">
        <span>
          {status === "loading" && "Chargement de l'artefact public…"}
          {status === "ok" && (date ? `Lecture du ${date} · timeframe : Quotidien (1D)` : "Timeframe : Quotidien (1D)")}
          {status === "error" && "Artefact indisponible pour le moment."}
        </span>
        <div className="flex items-center gap-3">
          <Link href="/v2/lecture-marche" className="flex items-center gap-1 text-blue hover:underline"><Newspaper size={12} aria-hidden="true" /> Lecture du marché</Link>
          <a href={SOURCE_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue hover:underline"><ExternalLink size={12} aria-hidden="true" /> Source publique</a>
        </div>
      </div>

      {status === "error" && (
        <section className="bg-surface border border-border rounded-lg p-5"><p className="text-sm text-muted">Artefact public indisponible pour le moment. Réessaie dans quelques minutes. Aucune donnée reconstruite.</p></section>
      )}

      {status === "ok" && (
        <>
          {/* PREMIER PLAN — lecture par actif (quotidien 1D) */}
          <section className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h2 className="text-sm font-semibold text-text">Par actif — Quotidien (1D)</h2>
              {rows.length > 0 && <span className="text-[11px] text-muted">{rows.length} actifs</span>}
            </div>

            {rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-muted text-xs">
                      <th className="text-left font-medium py-1.5 pr-3">Actif</th>
                      <th className="text-left font-medium py-1.5 px-2">Direction</th>
                      <th className="text-left font-medium py-1.5 px-2">Régime</th>
                      <th className="text-left font-medium py-1.5 px-2">Volatilité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.actif} className="border-t border-border">
                        <td className="py-2 pr-3 font-mono font-medium text-text">{r.actif}</td>
                        <td className={"py-2 px-2 font-medium " + dirClass(r.direction)}>{r.direction ? cap(r.direction) : <span className="text-muted/60">n/d</span>}</td>
                        <td className="py-2 px-2 text-text">{r.regime ? cap(r.regime) : <span className="text-muted/60">n/d</span>}</td>
                        <td className="py-2 px-2">
                          {r.volatility
                            ? <span className={"text-[11px] font-medium px-1.5 py-0.5 rounded " + volClass(r.volatility)}>{cap(r.volatility)}</span>
                            : <span className="text-muted/60 text-xs">n/d</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">Lecture par actif non disponible dans l'artefact du jour — n/d. Aucune donnée reconstruite.</p>
            )}
            <p className="text-[11px] text-muted/70 mt-3">
              Un seul timeframe est calculé par le Lab aujourd'hui : le <span className="text-text">quotidien (1D)</span>, tel quel (clôture de base gelée, pas temps réel). Direction et régime dérivés de la tendance quotidienne ; volatilité = niveau qualitatif de la dernière séance.
            </p>
          </section>

          {/* SECONDAIRE — agrégats globaux (rétrogradés) */}
          <section className="bg-surface/60 border border-border rounded-lg p-5">
            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Distribution agrégée (secondaire)</h2>
              {assets && <span className="text-[11px] text-muted/70">{assets.tracked}/{assets.total} actifs</span>}
            </div>
            <p className="text-[11px] text-muted/70 mb-3">Vue d'ensemble — <span className="text-text">ne représente pas</span> une direction unique applicable à tous les actifs. Le détail par actif ci-dessus fait foi.</p>

            {cons && (
              <div className="mb-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted">Consensus de régime :</span>
                <span className={"text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded " + (cons.aligned ? "bg-green/15 text-green" : "bg-orange/15 text-orange")}>
                  {cons.aligned ? `Consensus — ${cons.dominant}` : "Dispersion"}
                </span>
                <span className="text-xs text-text">{cons.dominant} {cons.count}/{cons.total} ({pct(cons.share)})</span>
              </div>
            )}

            {dist && (
              <div className="space-y-2">
                {dist.buckets.map((b) => (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="w-28 text-xs text-muted capitalize shrink-0">{b.label}</span>
                    <div className="flex-1 h-2.5 rounded bg-ink overflow-hidden">
                      <div className="h-full bg-blue/70 rounded" style={{ width: `${(b.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="w-14 text-right text-[11px] text-muted shrink-0">{b.count}/{dist.total}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-border text-xs">
              <span className="text-muted">Volatilité (agrégée) : </span>
              {vol ? <span className="text-text">{vol.level} sur {vol.count}/{vol.total}</span> : <span className="text-muted/60">n/d</span>}
            </div>
          </section>
        </>
      )}

      <p className="text-[10px] text-muted/60">
        Source : artefact public filtré stable (latest.md). Observation exploratoire, jamais confirmée. V1 et pages V2 existantes intactes.
      </p>
    </div>
  );
}
