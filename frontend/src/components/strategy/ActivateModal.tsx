"use client";
import { useState } from "react";
import { X, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { activateRun, paperTraderStart, paperTraderStop, type Destination } from "@/lib/api";

const DEST_INFO: Record<Destination, { label: string; color: string; warn?: string }> = {
  rd:          { label: "R&D (retirer du déploiement)",   color: "bg-gray-100 text-gray-700 border-gray-300" },
  paper:       { label: "Paper Trade",                     color: "bg-purple-50 text-purple-700 border-purple-300" },
  broker:      { label: "Personal Broker",                 color: "bg-blue-50 text-blue-700 border-blue-300",   warn: "Capital réel engagé." },
  propfirm:    { label: "PropFirm FTMO",                   color: "bg-amber-50 text-amber-700 border-amber-300", warn: "Challenge avec règles strictes (DD max, profit target)." },
  challenge_z: { label: "Challenge Z (TMAFX Climb)",       color: "bg-yellow-50 text-yellow-700 border-yellow-300", warn: "Challenge avec règles strictes." },
};

type Props = {
  runId: string;
  strategyName: string;
  destination: Destination;
  currentStage: string;
  onClose: () => void;
  onSuccess: (newStage: string) => void;
};

export default function ActivateModal({ runId, strategyName, destination, currentStage, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(destination === "paper" || destination === "rd");

  const info = DEST_INFO[destination];
  const requiresConfirm = destination === "broker" || destination === "propfirm" || destination === "challenge_z";

  async function handleActivate() {
    setLoading(true);
    setError(null);
    try {
      const res = await activateRun(runId, destination);

      // S59 Phase B : démarrer auto le paper trader si activation paper
      // Et le stopper si retour en R&D
      let traderMsg = "";
      try {
        if (destination === "paper") {
          const t = await paperTraderStart(runId);
          traderMsg = t.already_running ? " (paper trader déjà actif)" : ` (paper trader démarré · pid ${t.pid})`;
        } else if (destination === "rd") {
          await paperTraderStop(runId);
          traderMsg = " (paper trader arrêté)";
        }
      } catch (te) {
        traderMsg = ` ⚠ (paper trader: ${te instanceof Error ? te.message : String(te)})`;
      }

      const msg = destination === "rd"
        ? `${strategyName} retirée du déploiement (R&D).${traderMsg}`
        : `${strategyName} activée → ${DEST_INFO[destination].label}.${traderMsg}`;
      sessionStorage.setItem("activation_toast", JSON.stringify({ msg, at: Date.now() }));
      onSuccess(res.deployment_stage);
      setTimeout(() => window.location.reload(), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text">
            {destination === "rd" ? "Retirer du déploiement" : `Activer → ${info.label}`}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-text" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted">Stratégie</span>
              <span className="font-medium text-text">{strategyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Stade actuel</span>
              <span className="font-medium text-text">{currentStage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Nouveau stade</span>
              <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium ${info.color}`}>
                {info.label}
              </span>
            </div>
          </div>

          {info.warn && (
            <div className="flex items-start gap-2 text-xs p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-700">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{info.warn}</span>
            </div>
          )}

          {requiresConfirm && (
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-muted">
                Je confirme avoir compris les risques d'activation directe sans passer par Paper Trade au préalable.
              </span>
            </label>
          )}

          {error && (
            <div className="text-xs p-2.5 rounded bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <button
            onClick={onClose}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded border border-border bg-ink hover:bg-surface transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleActivate}
            disabled={loading || !confirmed}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-blue/15 border border-blue/40 text-blue hover:bg-blue/25 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
            {loading ? "Activation..." : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
