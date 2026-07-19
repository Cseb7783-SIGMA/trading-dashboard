"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { EpisodeSummary } from "@/lib/evidence/types";
import EvidenceEmptyState from "./EvidenceEmptyState";

function count(v?: number) {
  return v === 0 ? "0" : v == null ? "Non publié" : String(v);
}

// Ligne épisode interactive (clic souris toute la ligne + vrai lien clavier). Cible = id opaque.
function EpisodeRow({ base, e }: { base: string; e: EpisodeSummary }) {
  const router = useRouter();
  const href = `${base}/${encodeURIComponent(e.id)}`;
  return (
    <tr
      onClick={() => router.push(href)}
      className="border-t border-border cursor-pointer hover:bg-ink/50 focus-within:bg-ink/50"
    >
      <td className="py-2 pr-3">
        <Link
          href={href}
          aria-label={`Ouvrir l'épisode ${e.label ?? e.id}`}
          onClick={(ev) => ev.stopPropagation()}
          onKeyDown={(ev) => { if (ev.key === " ") { ev.preventDefault(); router.push(href); } }}
          className="text-text hover:text-blue focus:outline-none focus-visible:ring-1 focus-visible:ring-blue/60 rounded"
        >
          {e.label ?? e.id}
        </Link>
      </td>
      <td className="py-2 px-2 text-muted">{e.context ?? "Non publié"}</td>
      <td className="py-2 px-2 text-muted">{e.status ?? "Non publié"}</td>
      <td className="py-2 px-2 text-right text-muted">{count(e.tradeCount)}</td>
    </tr>
  );
}

export default function EpisodeTable({ strategyKey, rows }: { strategyKey: string; rows: EpisodeSummary[] }) {
  if (!rows || rows.length === 0) return <EvidenceEmptyState message="Aucun épisode publié" />;
  const base = `/v2/resultats-detailles/${encodeURIComponent(strategyKey)}/episodes`;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-muted text-xs">
            <th className="text-left font-medium py-1.5 pr-3">Épisode</th>
            <th className="text-left font-medium py-1.5 px-2">Contexte</th>
            <th className="text-left font-medium py-1.5 px-2">Statut</th>
            <th className="text-right font-medium py-1.5 px-2">Trades</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => <EpisodeRow key={e.id} base={base} e={e} />)}
        </tbody>
      </table>
    </div>
  );
}
