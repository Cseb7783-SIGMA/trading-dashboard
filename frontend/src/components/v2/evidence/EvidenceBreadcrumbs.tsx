import Link from "next/link";

export type Crumb = { label: string; href?: string };

export default function EvidenceBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center flex-wrap gap-1.5 text-xs text-muted mb-3" aria-label="Fil d'Ariane">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted/50" aria-hidden="true">→</span>}
          {c.href ? (
            <Link href={c.href} className="text-blue hover:underline">{c.label}</Link>
          ) : (
            <span className="text-text" aria-current="page">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
