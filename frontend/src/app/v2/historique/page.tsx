"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { History, ExternalLink, FileText, CornerUpLeft, Eye, BarChart3 } from "lucide-react";
import {
  sortReportsDesc, dateLabel, mostRecent, resolveCurrent,
  buildConfigSeries, seriesMax, reportForDate, pointLabel, isSelectedDate, type ConfigPoint,
} from "./history_utils";

// V2 — Historique des lectures + 1er graphique. Zone INDEPENDANTE, LECTURE SEULE.
// Source UNIQUE = artefacts publics sigma-reports/history/*.md + latest.md. Aucun backend, aucun index.json, aucune donnee inventee.
const OWNER = "Cseb7783-SIGMA";
const REPO = "sigma-reports";
const LIST_API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/history`;
const LATEST = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/latest.md`;
const raw = (name: string) => `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/history/${name}`;
const HISTORY_LINK = `https://github.com/${OWNER}/${REPO}/tree/main/history`;

const MD_COMPONENTS = {
  h1: ({ children }: any) => <h1 className="text-base font-semibold text-text mb-1">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-xs font-semibold text-blue uppercase tracking-wider mt-4 mb-1">{children}</h2>,
  p: ({ children }: any) => <p className="text-sm text-muted">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 space-y-1 text-sm text-text">{children}</ul>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold text-text">{children}</strong>,
  em: ({ children }: any) => <em className="text-xs text-muted/80">{children}</em>,
};

// Graphique SVG inline (zéro dépendance) — barres groupées par date, cliquables/clavier, « n/d » si donnée absente.
function ConfigChart({ series, files, selected, onPick }: { series: ConfigPoint[]; files: string[]; selected: string; onPick: (name: string) => void }) {
  const [focus, setFocus] = useState(-1);
  const data = [...series].reverse(); // historique = desc ; axe X = ancien -> récent
  const max = seriesMax(data);
  const W = 640, H = 220, padL = 26, padR = 10, padT = 20, padB = 40;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = data.length || 1;
  const slot = plotW / n;
  const bw = Math.max(4, Math.min(16, (slot - 10) / 2));
  const yOf = (v: number) => padT + plotH - (v / max) * plotH;
  const ticks = Array.from(new Set([0, Math.ceil(max / 2), max]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto touch-manipulation" preserveAspectRatio="xMidYMid meet"
      role="img" aria-label="Configurations déclenchées et sans déclenchement, par date. Colonnes activables pour ouvrir la lecture correspondante.">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} y1={yOf(t)} x2={W - padR} y2={yOf(t)} className="text-border" stroke="currentColor" strokeWidth={0.5} />
          <text x={padL - 4} y={yOf(t) + 3} textAnchor="end" className="fill-muted" fontSize={8}>{t}</text>
        </g>
      ))}
      {data.map((p, i) => {
        const cx = padL + slot * i + slot / 2;
        const x0 = padL + slot * i;
        const name = reportForDate(p.date, files);
        const clickable = p.available && !!name;
        const label = pointLabel(p);
        const foc = focus === i;
        const active = isSelectedDate(p.date, selected); // synchro inverse : rapport ouvert -> point actif
        const hi = active || foc;
        return (
          <g key={p.date}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={clickable ? `Ouvrir la lecture du ${label}` : label}
            aria-current={active ? "true" : undefined}
            aria-disabled={clickable ? undefined : true}
            className={clickable ? "cursor-pointer focus:outline-none" : "cursor-default"}
            onClick={clickable ? () => onPick(name as string) : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(name as string); } } : undefined}
            onMouseEnter={() => setFocus(i)} onMouseLeave={() => setFocus((f) => (f === i ? -1 : f))}
            onFocus={() => setFocus(i)} onBlur={() => setFocus((f) => (f === i ? -1 : f))}>
            <title>{active ? `${label} — lecture ouverte` : label}</title>
            <rect x={x0} y={padT} width={slot} height={H - padT - 4} fill="transparent" pointerEvents="all" />
            {hi && <rect x={x0 + 0.5} y={padT} width={slot - 1} height={plotH} rx={2} className="text-blue" fill="currentColor" opacity={active ? 0.14 : 0.08} />}
            {active && <rect x={x0 + 0.5} y={padT + 0.5} width={slot - 1} height={plotH - 1} rx={2} className="text-blue" fill="none" stroke="currentColor" strokeWidth={1} />}
            {hi && p.available && (
              <text x={cx} y={padT - 6} textAnchor="middle" className="fill-text" fontSize={9} fontWeight={600}>{p.on} / {p.off}</text>
            )}
            {!p.available || p.on == null || p.off == null ? (
              <text x={cx} y={padT + plotH / 2} textAnchor="middle" className="fill-muted" fontSize={8}>n/d</text>
            ) : (
              <>
                <rect x={cx - bw - 1} y={yOf(p.on)} width={bw} height={padT + plotH - yOf(p.on)} className="text-blue" fill="currentColor" rx={1} />
                <rect x={cx + 1} y={yOf(p.off)} width={bw} height={padT + plotH - yOf(p.off)} className="text-muted" fill="currentColor" opacity={0.45} rx={1} />
              </>
            )}
            <text x={cx} y={H - padB + 14} textAnchor="middle" className={hi ? "fill-blue" : "fill-muted"} fontSize={7}
              fontWeight={hi ? 600 : 400} textDecoration={active ? "underline" : undefined}>{p.date.slice(5)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function V2HistoriquePage() {
  const [files, setFiles] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [sel, setSel] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [cstatus, setCstatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [series, setSeries] = useState<ConfigPoint[]>([]);
  const reportRef = useRef<HTMLElement | null>(null);

  function pickFromChart(name: string) {
    loadContent(name);
    if (typeof window !== "undefined") reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadContent(name: string) {
    setSel(name); setCstatus("loading"); setContent("");
    try {
      const r = await fetch(`${raw(name)}?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const txt = await r.text();
      if (!txt || !txt.trim()) throw new Error();
      setContent(txt); setCstatus("ok");
    } catch { setCstatus("error"); }
  }

  async function loadList() {
    setStatus("loading");
    try {
      const r = await fetch(`${LIST_API}?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const arr = await r.json();
      const names = sortReportsDesc((Array.isArray(arr) ? arr : []).map((x: any) => x && x.name));
      setFiles(names);
      let latestTxt: string | null = null;
      try { const lr = await fetch(`${LATEST}?t=${Date.now()}`, { cache: "no-store" }); if (lr.ok) latestTxt = await lr.text(); } catch { latestTxt = null; }
      setCurrent(resolveCurrent(names, latestTxt));
      setStatus("ok");
      if (names.length) loadContent(names[0]); else setCstatus("idle");
      // Série graphique : fetch de chaque rapport (md absent -> point indisponible, jamais zéro)
      const entries = await Promise.all(names.map(async (f) => {
        try { const rr = await fetch(`${raw(f)}?t=${Date.now()}`, { cache: "no-store" }); return { date: dateLabel(f), md: rr.ok ? await rr.text() : null }; }
        catch { return { date: dateLabel(f), md: null }; }
      }));
      setSeries(buildConfigSeries(entries));
    } catch { setStatus("error"); }
  }

  useEffect(() => { loadList(); }, []);

  const top = mostRecent(files);
  const unavailable = series.filter((p) => !p.available).map((p) => p.date);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue/20 text-blue uppercase">V2 · Prototype</span>
          <History size={16} className="text-blue" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-text">Historique des lectures</h1>
        <p className="text-xs text-muted mt-1">
          Lecture seule des rapports quotidiens publics filtrés. Aucune donnée privée, aucune recette, aucune reconstruction.
          La <span className="text-text">lecture courante</span> fait autorité via latest.md.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted flex-wrap">
        <span>
          {status === "loading" && "Chargement de l'historique…"}
          {status === "ok" && `${files.length} lecture(s) disponible(s)`}
          {status === "error" && "Historique indisponible pour le moment."}
        </span>
        <div className="flex items-center gap-3">
          <Link href="/v2/lecture-marche" className="flex items-center gap-1 text-blue hover:underline"><Eye size={12} aria-hidden="true" /> Lecture courante</Link>
          <a href={HISTORY_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue hover:underline"><ExternalLink size={12} aria-hidden="true" /> Source publique</a>
        </div>
      </div>

      {/* Graphique : configurations déclenchées vs sans, par date */}
      {status === "ok" && series.length > 0 && (
        <section className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={15} className="text-blue" aria-hidden="true" />
            <h2 className="text-xs font-semibold text-blue uppercase tracking-wider">Configurations par date</h2>
          </div>
          <div className="flex items-center gap-4 mb-2 text-[11px] text-muted flex-wrap">
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue" /> déclenchées</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-muted/50" /> sans déclenchement</span>
          </div>
          <ConfigChart series={series} files={files} selected={sel} onPick={pickFromChart} />
          <p className="text-[11px] text-muted/70 mt-1">Survol ou focus clavier : valeurs exactes. Clic ou Entrée/Espace sur une date : ouvre la lecture. Les jours « n/d » ne sont pas activables.</p>
          {unavailable.length > 0 && (
            <p className="text-[11px] text-muted/70">Données indisponibles (affichées « n/d ») : {unavailable.join(", ")}.</p>
          )}
        </section>
      )}

      {status === "ok" && files.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {files.map((f) => {
            const active = f === sel;
            const isCur = current !== null && f === current;
            const isTopOnly = current === null && f === top;
            return (
              <button key={f} onClick={() => loadContent(f)} aria-current={active ? "true" : undefined}
                className={"flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-sm transition-colors " + (active ? "border-blue/40 bg-blue/10 text-blue font-medium" : "border-border text-muted hover:text-text hover:bg-ink")}>
                <FileText size={13} aria-hidden="true" />{dateLabel(f)}
                {isCur && <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-blue/20 text-blue uppercase">actuelle</span>}
                {isTopOnly && <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-muted/15 text-muted lowercase">plus récent</span>}
              </button>
            );
          })}
          {current !== null && sel !== current && (
            <button onClick={() => loadContent(current)} className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-blue/40 text-blue text-sm hover:bg-blue/10 transition-colors">
              <CornerUpLeft size={13} aria-hidden="true" /> Revenir à l'actuelle
            </button>
          )}
        </div>
      )}

      {current === null && status === "ok" && files.length > 0 && (
        <p className="text-[11px] text-muted/70">
          Lien avec latest.md non établi : l'entrée en tête est « plus récent » (pas « actuelle »). Lecture courante faisant autorité : <Link href="/v2/lecture-marche" className="text-blue hover:underline">Lecture du marché</Link>.
        </p>
      )}

      <section ref={reportRef} className="bg-surface border border-border rounded-lg p-5 min-h-[8rem] scroll-mt-4">
        {status === "error" && <p className="text-sm text-muted">Historique indisponible pour le moment. Réessaie dans quelques minutes.</p>}
        {status === "ok" && files.length === 0 && <p className="text-sm text-muted">Aucune lecture archivée pour l'instant.</p>}
        {status === "ok" && files.length > 0 && (
          <>
            {sel && (
              <div className="flex items-center gap-2 mb-3 text-xs text-muted">
                <span>Lecture du {dateLabel(sel)}</span>
                {current !== null && sel === current && <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-blue/20 text-blue uppercase">actuelle</span>}
              </div>
            )}
            {cstatus === "loading" && <p className="text-sm text-muted">Chargement du rapport…</p>}
            {cstatus === "error" && <p className="text-sm text-muted">Ce rapport est indisponible ou invalide. Aucune donnée reconstruite.</p>}
            {cstatus === "ok" && <div className="space-y-2"><ReactMarkdown components={MD_COMPONENTS}>{content}</ReactMarkdown></div>}
          </>
        )}
      </section>

      <p className="text-[10px] text-muted/60">
        Source : rapports publics filtrés (sigma-reports/history/ + latest.md). Statut : observation exploratoire,
        jamais confirmée. Les décisions de bascule restent humaines et internes (V1).
      </p>
    </div>
  );
}
