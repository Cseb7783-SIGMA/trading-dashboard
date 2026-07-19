"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Newspaper, RefreshCw, Info, ClipboardList, LineChart, Radio,
  ArrowRightCircle, ShieldAlert, ExternalLink, Layers, Activity, Gauge,
} from "lucide-react";

// V2 — Prototype. Zone INDEPENDANTE du cockpit V1.
// Source UNIQUE = artefact public filtre (sigma-reports/latest.md), lecture seule.
// N'utilise PAS src/lib/api.ts ni le backend V1 : aucun acces aux strategies/recettes internes.
const PUBLIC_URL =
  "https://raw.githubusercontent.com/Cseb7783-SIGMA/sigma-reports/main/latest.md";
const PUBLIC_LINK =
  "https://github.com/Cseb7783-SIGMA/sigma-reports/blob/main/latest.md";

type Parsed = {
  title: string;
  statut: string;
  seance: string;
  footer: string;
  sections: Record<string, string>;
};

function parse(md: string): Parsed {
  const title = (md.match(/^#\s+(.+)$/m) || [])[1] || "Lecture du marché";
  const statut = (md.match(/^Statut\s*:\s*(.+)$/m) || [])[1] || "";
  const seance = (md.match(/S[ée]ance observ[ée]e\s*:\s*(.+)$/m) || [])[1] || "";
  const footer = (md.match(/^_(.+)_\s*$/m) || [])[1] || "";
  const sections: Record<string, string> = {};
  const parts = md.split(/^##\s+/m);
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    const nl = p.indexOf("\n");
    sections[p.slice(0, nl).trim()] = p.slice(nl + 1).trim();
  }
  return { title, statut, seance, footer, sections };
}

// 3 indicateurs de synthese — derives UNIQUEMENT du meme latest.md (aucune donnee neuve).
function indicators(md: string) {
  const g = (re: RegExp) => md.match(re);
  const act = g(/(\d+)\s+actifs suivis sur\s+(\d+)/i);
  const cfg = g(/(\d+)\s+configurations déclenchées,\s+(\d+)\s+sans/i);
  const cons = g(/consolidation\s+(\d+)/i);
  const trans = g(/transition\s+(\d+)/i);
  const haus = g(/hausse\s+(\d+)/i);
  const vol = g(/élevée sur\s+(\d+)\s+des\s+(\d+)/i);
  const trend: [string, number][] = [
    ["Consolidation", cons ? +cons[1] : -1],
    ["Transition", trans ? +trans[1] : -1],
    ["Hausse", haus ? +haus[1] : -1],
  ];
  trend.sort((a, b) => b[1] - a[1]);
  const dominant = trend[0][1] >= 0 ? trend[0][0] : "—";
  return {
    actifs: act ? `${act[1]} / ${act[2]}` : "—",
    config: cfg ? { on: cfg[1], off: cfg[2] } : null,
    regime: dominant,
    vol: vol ? `${vol[1]} / ${vol[2]}` : null,
  };
}

const MD_COMPONENTS = {
  p: ({ children }: any) => <p className="text-sm text-muted">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 space-y-1.5 text-sm text-text">{children}</ul>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold text-text">{children}</strong>,
  em: ({ children }: any) => <em className="text-xs text-muted/80">{children}</em>,
};

function Stat({ Icon, label, children }: { Icon: typeof Info; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={13} className="text-blue" aria-hidden="true" />
        <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-text">{children}</div>
    </div>
  );
}

function Card({ Icon, title, children }: { Icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className="text-blue" aria-hidden="true" />
        <h2 className="text-xs font-semibold text-blue uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function V2MarketReadingPage() {
  const [data, setData] = useState<Parsed | null>(null);
  const [raw, setRaw] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [fetchedAt, setFetchedAt] = useState<string>("");

  async function load() {
    setStatus("loading");
    try {
      const res = await fetch(`${PUBLIC_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const text = await res.text();
      setRaw(text);
      setData(parse(text));
      setFetchedAt(new Date().toLocaleString("fr-CA"));
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }
  useEffect(() => { load(); }, []);

  const sec = (prefix: string) => {
    if (!data) return "";
    const key = Object.keys(data.sections).find((k) => k.toLowerCase().startsWith(prefix.toLowerCase()));
    return key ? data.sections[key] : "";
  };
  const ind = raw ? indicators(raw) : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue/20 text-blue uppercase">V2 · Prototype</span>
          <Newspaper size={16} className="text-blue" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-text">Lecture du marché</h1>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
          Observation exploratoire — pas un conseil — aucune position réelle
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted flex-wrap">
        <span>
          {status === "loading" && "Chargement…"}
          {status === "ok" && (<>Dernière récupération : <span className="text-text">{fetchedAt}</span> · source publique filtrée</>)}
          {status === "error" && "Artefact public indisponible pour le moment."}
        </span>
        <div className="flex items-center gap-3">
          <a href={PUBLIC_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue hover:underline">
            <ExternalLink size={12} aria-hidden="true" /> Source publique
          </a>
          <button onClick={load} className="flex items-center gap-1.5 px-2 py-1 rounded text-muted hover:text-text hover:bg-ink transition-colors">
            <RefreshCw size={13} aria-hidden="true" /> Rafraîchir
          </button>
        </div>
      </div>

      {/* 3 indicateurs de synthese (derives de latest.md) */}
      {status === "ok" && ind && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat Icon={Layers} label="Actifs suivis">
            <span className="text-lg font-semibold">{ind.actifs}</span>
          </Stat>
          <Stat Icon={Activity} label="Configurations">
            {ind.config ? (
              <span className="text-sm">
                <span className="text-lg font-semibold">{ind.config.on}</span> déclenchées
                <span className="text-muted"> · {ind.config.off} sans</span>
              </span>
            ) : <span className="text-muted">—</span>}
          </Stat>
          <Stat Icon={Gauge} label="Régime · volatilité">
            <span className="text-sm">
              <span className="font-semibold">{ind.regime}</span>
              {ind.vol && <span className="text-muted"> · vol élevée {ind.vol}</span>}
            </span>
          </Stat>
        </div>
      )}

      {status === "error" ? (
        <div className="bg-surface border border-border rounded-lg p-5">
          <p className="text-sm text-muted">Impossible de lire l&apos;artefact public. Réessaie dans quelques minutes.</p>
        </div>
      ) : (
        data && (
          <>
            <Card Icon={Info} title="Statut du rapport">
              <p className="text-sm text-muted">{data.statut}</p>
              {data.seance && (<p className="text-sm text-text mt-2">Séance observée : <span className="font-medium">{data.seance}</span></p>)}
            </Card>
            <Card Icon={ClipboardList} title="Activité d'observation">
              <ReactMarkdown components={MD_COMPONENTS}>{sec("Activit")}</ReactMarkdown>
            </Card>
            <Card Icon={LineChart} title="Lecture du marché">
              <ReactMarkdown components={MD_COMPONENTS}>{sec("Lecture")}</ReactMarkdown>
            </Card>
            <Card Icon={Radio} title="Signaux">
              <ReactMarkdown components={MD_COMPONENTS}>{sec("Signaux")}</ReactMarkdown>
            </Card>
            <Card Icon={ArrowRightCircle} title="Suite / décisions">
              <ReactMarkdown components={MD_COMPONENTS}>{sec("Suite")}</ReactMarkdown>
            </Card>
          </>
        )
      )}

      <section className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={15} className="text-muted" aria-hidden="true" />
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Ce que ce rapport n&apos;est pas</h2>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted">
          <li>Pas une recommandation.</li>
          <li>Pas un signal confirmé.</li>
          <li>Pas un <span className="font-mono text-xs">proven_link</span> (aucune performance prouvée).</li>
        </ul>
      </section>

      <p className="text-[10px] text-muted/60">
        Source : projection publique filtrée (sigma-reports/latest.md). Statut : observation exploratoire,
        jamais confirmée. Les décisions de bascule restent humaines et internes (V1).
      </p>
    </div>
  );
}
