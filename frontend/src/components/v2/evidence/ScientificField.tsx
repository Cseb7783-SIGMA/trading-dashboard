// Rend un champ publié, vide ou non disponible — SANS interprétation.
export default function ScientificField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2 border-t border-border first:border-t-0">
      <div className="text-[11px] font-medium text-muted uppercase tracking-wider">{label}</div>
      <div className="text-sm text-text mt-0.5 whitespace-pre-line">
        {value ? value : <span className="text-muted/60">Non publié</span>}
      </div>
    </div>
  );
}
