import type { EvidenceSummary } from "@/lib/evidence/types";
import EvidenceTable from "./EvidenceTable";

export default function EvidenceSection({ title, rows }: { title: string; rows: EvidenceSummary[] }) {
  return (
    <section className="bg-surface border border-border rounded-lg p-5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        <span className="text-[11px] text-muted" aria-label="nombre de configurations">{rows.length}</span>
      </div>
      <EvidenceTable rows={rows} />
    </section>
  );
}
