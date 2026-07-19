"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, Eye, AlertTriangle, HelpCircle, ExternalLink, CheckCircle2 } from "lucide-react";
import {
  countReports, reportSpan, parseObservation, parseInsufficient,
  type Observation,
} from "./results_utils";

// V2 — Résultats / Forward evidence. Zone INDEPENDANTE, LECTURE SEULE.
// Sources produit STABLES uniquement = latest.md + history/. handoff/ EXCLU (publié seulement lors d'une décision). Aucun backend, aucune performance inventée.
const OWNER = "Cseb7783-SIGMA";
const REPO = "sigma-reports";
const LIST_API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/history`;
const R = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main`;
const SOURCE_LINK = `https://github.com/${OWNER}/${REPO}`;

type Kind = "result" | "observation" | "insufficient" | "unknown";
const PILL: Record<Kind, { label: string; cls: string; icon: string }> = {
  result:       { label: "Résultat validé",       cls: "bg-green/15 text-green",  icon: "text-green" },
  observation:  { label: "En accumulation",       cls: "bg-blue/15 text-blue",    icon: "text-blue" },
  insufficient: { label: "Données insuffisantes", cls: "bg-orange/15 text-orange", icon: "text-orange" },
  unknown:      { label: "Aucun candidat validé", cls: "bg-muted/15 text-muted",  icon: "text-muted" },
};
const ICON: Record<Kind, any> = { result: CheckCircle2, observation: Eye, insufficient: AlertTriangle, unknown: HelpCircle };

function Card({ kind, title, children }: { kind: Kind; title: string; children: React.ReactNode }) {
  const Ic = ICON[kind];
  const p = PILL[kind];
  return (
    <section className="bg-surface border border-border rounded-lg p-5">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Ic size={16} className={p.icon} aria-hidden="true" />
          <h2 className="text-sm font-semibold text-text">{title}</h2>
        </div>
        <span className={"text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded " + p.cls}>{p.label}</span>
      </div>
      <div className="text-sm text-muted space-y-1">{children}</div>
    </section>
  );
}

export default function V2ResultatsPage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [days, setDays] = useState(0);
  const [span, setSpan] = useState<{ from: string; to: string } | null>(null);
  const [obs, setObs] = useState<Observation | null>(null);
  const [obsDate, setObsDate] = useState<string | null>(null);
  const [lims, setLims] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setStatus("loading");
      try {
        const lr = await fetch(`${LIST_API}?t=${Date.now()}`, { cache: "no-store" });
        if (!lr.ok) throw new Error();
        const arr = await lr.json();
        const names = (Array.isArray(arr) ? arr : []).map((x: any) => x && x.name);
        setDays(countReports(names));
        setSpan(reportSpan(names));

        // Sources produit stables uniquement : latest.md + history/. handoff/ volontairement NON lu.
        let latestTxt: string | null = null;
        try { const r = await fetch(`${R}/latest.md?t=${Date.now()}`, { cache: "no-store" }); if (r.ok) latestTxt = await r.text(); } catch { latestTxt = null; }

        setObs(parseObservation(latestTxt));
        const m = typeof latestTxt === "string" ? latestTxt.match(/(\d{4}-\d{2}-\d{2})/) : null;
        setObsDate(m ? m[1] : null);
        setLims(parseInsufficient(latestTxt));
        setStatus("ok");
      } catch { setStatus("error"); }
    })();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue/20 text-blue uppercase">V2 · Prototype</span>
          <Target size={16} className="text-blue" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-text">Résultats / Forward evidence</h1>
        <p className="text-xs text-muted mt-1">
          Statut : observation seulement. Aucune performance réelle, aucune position, rien de confirmé.
          Cette page distingue strictement trois choses : ce qui est un <span className="text-green">résultat validé</span>,
          ce qui est une <span className="text-blue">observation en accumulation</span>, et ce qui reste <span className="text-muted">inconnu / insuffisant</span>.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted flex-wrap">
        <span>
          {status === "loading" && "Chargement des artefacts publics…"}
          {status === "ok" && "Source : rapports publics filtrés (lecture seule)"}
          {status === "error" && "Artefacts indisponibles pour le moment."}
        </span>
        <div className="flex items-center gap-3">
          <Link href="/v2/historique" className="flex items-center gap-1 text-blue hover:underline"><Eye size={12} aria-hidden="true" /> Historique</Link>
          <a href={SOURCE_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue hover:underline"><ExternalLink size={12} aria-hidden="true" /> Source publique</a>
        </div>
      </div>

      {status === "error" && (
        <section className="bg-surface border border-border rounded-lg p-5"><p className="text-sm text-muted">Artefacts publics indisponibles pour le moment. Réessaie dans quelques minutes. Aucune donnée reconstruite.</p></section>
      )}

      {status === "ok" && (
        <>
          {/* 1. Résultats réellement disponibles */}
          <Card kind="result" title="Résultats réellement disponibles">
            <p className="text-text">Aucun résultat validé publié à ce jour.</p>
            <p>Aucune performance n'est affichée : aucune stratégie n'a franchi la validation. Toute mesure de rendement serait, à ce stade, inventée — donc rien n'est montré ici tant qu'un artefact de résultat validé n'existe pas.</p>
          </Card>

          {/* 2. Observation / forward evidence en accumulation */}
          <Card kind="observation" title="Observation / forward evidence en accumulation">
            {days > 0 ? (
              <>
                <p className="text-text">{days} séance(s) observée(s){span ? ` — du ${span.from} au ${span.to}` : ""}.</p>
                {obs && (obs.assetsTracked != null || obs.configsOn != null) && (
                  <p>
                    Dernière lecture{obsDate ? ` (${obsDate})` : ""} :{" "}
                    {obs.assetsTracked != null ? `${obs.assetsTracked}${obs.assetsTotal != null ? `/${obs.assetsTotal}` : ""} actifs suivis` : "actifs suivis n/d"}
                    {obs.configsOn != null ? `, ${obs.configsOn} config. déclenchées / ${obs.configsOff ?? "n/d"} sans` : ""}.
                  </p>
                )}
                {obs && obs.bilan && <p>Bilan journalier (observation, non conclusif) : « {obs.bilan} ».</p>}
                <p className="text-[12px] text-muted/70">Ce sont des observations quotidiennes qui s'accumulent — pas des résultats. Elles ne prouvent aucun edge.</p>
              </>
            ) : (
              <p>Aucune séance d'observation disponible pour l'instant.</p>
            )}
          </Card>

          {/* 3. Données insuffisantes */}
          <Card kind="insufficient" title="Données insuffisantes pour conclure">
            {lims.length > 0 ? (
              <>
                <p>Limites signalées par la dernière lecture (verbatim, non interprétées) :</p>
                <ul className="list-disc pl-5 space-y-1">
                  {lims.map((s, i) => <li key={i}>{s}.</li>)}
                </ul>
              </>
            ) : (
              <p>Aucune limite de données explicitement signalée dans la dernière lecture. Cela ne signifie pas que l'échantillon soit suffisant pour conclure.</p>
            )}
          </Card>

          {/* 4. Statut des candidats — non publié (aucun artefact produit stable ne l'expose) */}
          <Card kind="unknown" title="Statut des candidats">
            <p className="text-text">Statut des candidats non publié.</p>
            <p>Aucun artefact public stable n'expose l'état des candidats. On ne l'infère pas : l'absence d'artefact ne veut pas dire « zéro candidat ». Ce bloc s'activera si, et seulement si, un artefact de statut produit est publié.</p>
          </Card>
        </>
      )}

      <p className="text-[10px] text-muted/60">
        Source : artefacts publics filtrés stables (latest.md, history/). Observation exploratoire, jamais confirmée.
        Les décisions de bascule restent humaines et internes (V1). Aucune performance affichée n'est réelle tant qu'un résultat validé n'a pas été publié.
      </p>
    </div>
  );
}
