"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TradeSummary } from "@/lib/evidence/types";
import EvidenceEmptyState from "./EvidenceEmptyState";

// Libellé de statut (présentation seulement ; la projection publique n'est pas modifiée).
function tradeStatus(s?: string) {
  if (!s) return "Non publié";
  if (/trade observé/i.test(s)) return "Trade observé · preuve en accumulation";
  return s;
}

// Ligne trade interactive (clic souris toute la ligne + vrai lien clavier). Cible = id opaque.
function TradeRow({ base, t }: { base: string; t: TradeSummary }) {
  const router = useRouter();
  const href = `${base}/${encodeURIComponent(t.id)}`;
  return (
    <tr
      onClick={() => router.push(href)}
      className="border-t border-border cursor-pointer hover:bg-ink/50 focus-within:bg-ink/50"
    >
      <td className="py-2 pr-3">
        <Link
          href={href}
          aria-label={`Ouvrir le dossier du trade ${t.id}`}
          onClick={(ev) => ev.stopPropagation()}
          onKeyDown={(ev) => { if (ev.key === " ") { ev.preventDefault(); router.push(href); } }}
          className="font-mono text-text hover:text-blue focus:outline-none focus-visible:ring-1 focus-visible:ring-blue/60 rounded"
        >
          {t.id}
        </Link>
      </td>
      <td className="py-2 px-2 text-muted">{t.openedAt ?? "Non publié"}</td>
      <td className="py-2 px-2 text-muted">{t.closedAt ?? "Non publié"}</td>
      <td className="py-2 px-2 text-muted">{tradeStatus(t.resultStatus)}</td>
    </tr>
  );
}

export default function TradeTable({
  strategyKey, episodeId, rows,
}: { strategyKey: string; episodeId: string; rows: TradeSummary[] }) {
  if (!rows || rows.length === 0) return <EvidenceEmptyState message="Aucun trade publié" />;
  const base = `/v2/resultats-detailles/${encodeURIComponent(strategyKey)}/episodes/${encodeURIComponent(episodeId)}/trades`;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-muted text-xs">
            <th className="text-left font-medium py-1.5 pr-3">Trade</th>
            <th className="text-left font-medium py-1.5 px-2">Ouverture</th>
            <th className="text-left font-medium py-1.5 px-2">Clôture</th>
            <th className="text-left font-medium py-1.5 px-2">Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => <TradeRow key={t.id} base={base} t={t} />)}
        </tbody>
      </table>
    </div>
  );
}
