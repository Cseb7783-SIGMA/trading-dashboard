export default function ExpandCollapseButton({
  expanded, onToggle, totalCount,
}: { expanded: boolean; onToggle: () => void; totalCount: number }) {
  return (
    <button onClick={onToggle} className="mt-2 text-xs text-blue hover:underline" aria-expanded={expanded}>
      {expanded ? "Réduire" : `Voir tout (${totalCount})`}
    </button>
  );
}
