"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EvidenceSummary } from "@/lib/evidence/types";

// Valeur numérique publiée : 0 réel affiché « 0 » ; absente => « Non publié » (jamais transformée en 0).
function count(v?: number) {
  return v === 0 ? "0" : v == null ? "Non publié" : String(v);
}

// Ligne interactive ACCESSIBLE : le vrai lien (cellule Actif, role=link natif) porte le focus clavier
// (Entrée native + Espace géré). Toute la ligne est cliquable à la souris. La cible = id public OPAQUE, jamais le libellé.
export default function EvidenceTableRow({ item }: { item: EvidenceSummary }) {
  const router = useRouter();
  const href = `/v2/resultats-detailles/${encodeURIComponent(item.id)}`;
  const label = `Ouvrir ${item.asset} — ${item.configuration}`;
  return (
    <tr
      onClick={() => router.push(href)}
      className="border-t border-border cursor-pointer hover:bg-ink/50 focus-within:bg-ink/50"
    >
      <td className="py-2 pr-3">
        <Link
          href={href}
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === " ") { e.preventDefault(); router.push(href); } }}
          className="font-mono font-medium text-text hover:text-blue focus:outline-none focus-visible:ring-1 focus-visible:ring-blue/60 rounded"
        >
          {item.asset}
        </Link>
      </td>
      <td className="py-2 px-2 text-muted">{item.timeframe}</td>
      <td className="py-2 px-2 text-text">{item.configuration}</td>
      <td className="py-2 px-2 text-right text-muted">{count(item.episodeCount)}</td>
      <td className="py-2 px-2 text-right text-muted">{count(item.tradeCount)}</td>
      <td className="py-2 px-2 text-muted">{item.updatedAt ?? "Non publié"}</td>
    </tr>
  );
}
