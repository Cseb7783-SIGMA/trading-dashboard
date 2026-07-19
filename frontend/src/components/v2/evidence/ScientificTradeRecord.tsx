import type { ScientificTradeRecord as Rec } from "@/lib/evidence/types";
import ScientificField from "./ScientificField";

// Les 11 sections du dossier scientifique, dans l'ordre décidé.
const ORDER: { key: keyof Rec; label: string }[] = [
  { key: "context", label: "Contexte" },
  { key: "observations", label: "Observations" },
  { key: "agentDecision", label: "Décision des agents" },
  { key: "entry", label: "Entrée" },
  { key: "stop", label: "Stop" },
  { key: "target", label: "Objectif" },
  { key: "management", label: "Gestion" },
  { key: "exit", label: "Sortie" },
  { key: "result", label: "Résultat" },
  { key: "postMortem", label: "Post-mortem" },
  { key: "learning", label: "Apprentissage" },
];

export default function ScientificTradeRecord({ record }: { record: Rec }) {
  return (
    <div>
      {ORDER.map((f) => <ScientificField key={String(f.key)} label={f.label} value={record?.[f.key]} />)}
    </div>
  );
}
