export default function EvidenceEmptyState({ message = "Aucune preuve publiée" }: { message?: string }) {
  return <p className="text-sm text-muted py-3">{message}</p>;
}
