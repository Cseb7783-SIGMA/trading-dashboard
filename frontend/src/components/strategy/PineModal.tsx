"use client";
import { useEffect, useState } from "react";
import { X, Copy, ExternalLink, Check, Sparkles } from "lucide-react";

type PineResponse = { available: boolean; strategy_name: string; pine_code?: string; expected_path?: string; message?: string; file_size_bytes?: number };

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PineModal({ runId, isOpen, onClose, instrument }: { runId: string; isOpen: boolean; onClose: () => void; instrument?: string }) {
  const [pine, setPine] = useState<PineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tvLaunched, setTvLaunched] = useState(false);

  useEffect(() => {
    if (!isOpen || !runId) return;
    setLoading(true);
    fetch(`${API}/runs/${encodeURIComponent(runId)}/pine`)
      .then((r) => r.json())
      .then(setPine)
      .finally(() => setLoading(false));
  }, [isOpen, runId]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!pine?.pine_code) return;
    await navigator.clipboard.writeText(pine.pine_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInTV = async () => {
    if (!pine?.pine_code) return;
    await navigator.clipboard.writeText(pine.pine_code);
    setCopied(true);

    const symbol = instrument === "QQQ" ? "NASDAQ:QQQ"
                 : instrument === "SPY" ? "AMEX:SPY"
                 : instrument === "IWM" ? "AMEX:IWM"
                 : `NASDAQ:${instrument}`;

    const url = `https://www.tradingview.com/chart/?symbol=${symbol}`;
    window.open(url, "_blank", "noopener,noreferrer");

    setTvLaunched(true);
    setTimeout(() => setTvLaunched(false), 8000);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClickOutside = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={handleClickOutside}>
      <div className="bg-surface border border-border rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <div>
            <div className="font-medium text-sm">Pine Script V6 — {pine?.strategy_name || "Chargement…"}</div>
            {pine?.available && pine.file_size_bytes && (
              <div className="text-xs text-muted mt-0.5">{Math.round(pine.file_size_bytes / 1024)} KB · prêt pour TradingView · cible {instrument}</div>
            )}
          </div>
          <div className="flex gap-2">
            {pine?.available && (
              <>
                <button onClick={handleCopy} className="px-3 py-1.5 text-xs rounded border border-border hover:bg-surface-hover flex items-center gap-1.5">
                  {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  {copied ? "Copié" : "Copy"}
                </button>
                <button onClick={handleOpenInTV} className="px-3 py-1.5 text-xs rounded bg-blue/10 border border-blue/40 text-blue hover:bg-blue/20 flex items-center gap-1.5">
                  <Sparkles size={12} />
                  Copy + Open in TV
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-hover" aria-label="Fermer">
              <X size={16} />
            </button>
          </div>
        </div>

        {tvLaunched && pine?.available && (
          <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded text-xs">
            <div className="font-medium text-green-800 mb-2 flex items-center gap-1.5">
              <Check size={13} />
              Code copié + TradingView ouvert dans un nouvel onglet
            </div>
            <div className="text-green-700 leading-relaxed">
              <strong>Dans TradingView, suis ces étapes :</strong>
              <ol className="mt-1.5 ml-4 space-y-0.5 list-decimal">
                <li>Si le chart affiche un autre symbol : clique sur le symbol en haut à gauche → tape <code className="bg-white px-1 rounded">{instrument}</code> → enter</li>
                <li>Ouvre <strong>Pine Editor</strong> en bas (ou Cmd+E / Ctrl+E)</li>
                <li>Clique sur <strong>« New script »</strong> (ou ouvre un script vide existant)</li>
                <li><strong>Cmd+A</strong> (sélectionne tout) puis <strong>Cmd+V</strong> (colle notre code)</li>
                <li>Clique sur <strong>« Add to Chart »</strong> (en haut à droite du Pine Editor)</li>
                <li>(Optionnel) <strong>Save</strong> avec un nom pour le réutiliser plus tard</li>
              </ol>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          {loading && <div className="text-xs text-muted text-center py-8">Chargement Pine Script…</div>}

          {!loading && pine && !pine.available && (
            <div className="text-center py-12">
              <div className="text-sm font-medium mb-2">Pine Script non disponible</div>
              <div className="text-xs text-muted mb-4">{pine.message}</div>
              <div className="text-xs text-muted bg-surface-hover inline-block px-3 py-2 rounded font-mono">
                Path attendu : {pine.expected_path}
              </div>
            </div>
          )}

          {!loading && pine?.available && pine.pine_code && (
            <pre className="text-xs font-mono leading-relaxed bg-surface-hover p-4 rounded overflow-x-auto" style={{ whiteSpace: "pre" }}>
              <code>{pine.pine_code}</code>
            </pre>
          )}
        </div>

        <div className="p-3 border-t border-border bg-surface-hover text-xs text-muted flex justify-between items-center">
          <span>
            <strong>« Copy »</strong> : copie seul · <strong>« Copy + Open in TV »</strong> : copie + ouvre TV + affiche workflow
          </span>
          {pine?.available && (
            <a
              href={`https://www.tradingview.com/chart/?symbol=${instrument === "QQQ" ? "NASDAQ:QQQ" : instrument === "SPY" ? "AMEX:SPY" : instrument === "IWM" ? "AMEX:IWM" : `NASDAQ:${instrument}`}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue hover:underline flex items-center gap-1"
            >
              <ExternalLink size={10} />
              Ouvrir TV sans copier
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
