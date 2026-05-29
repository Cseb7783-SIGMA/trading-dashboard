"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Copy, Save } from "lucide-react";

interface Props {
  text: string;
  loading: boolean;
  onSave?: () => Promise<void>;
}

export default function ResponseStream({ text, loading, onSave }: Props) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!text && !loading) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!onSave || saving) return;
    setSaving(true);
    try {
      await onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-muted uppercase tracking-wider">Réponse Claude</span>
        {loading && <span className="inline-block w-2 h-2 rounded-full bg-blue animate-pulse" />}
      </div>

      <div className="text-sm text-text leading-relaxed prose-trading">
        {!text && loading
          ? <span className="text-muted animate-pulse">Génération en cours…</span>
          : (
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-base font-bold text-text mt-4 mb-2 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-semibold text-text mt-4 mb-2 first:mt-0 border-b border-border pb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold text-blue mt-3 mb-1">{children}</h3>,
                p:  ({ children }) => <p className="mb-2 last:mb-0 text-text">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 space-y-1 pl-4">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 space-y-1 pl-4 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="text-text before:content-['–'] before:text-muted before:mr-2">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
                em: ({ children }) => <em className="italic text-muted">{children}</em>,
                code: ({ children }) => <code className="font-mono text-xs bg-bg px-1 py-0.5 rounded text-blue">{children}</code>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-blue pl-3 my-2 text-muted italic">{children}</blockquote>,
                hr: () => <hr className="border-border my-3" />,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="w-full text-xs border border-border rounded">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-bg">{children}</thead>,
                th: ({ children }) => <th className="px-3 py-2 text-left text-muted font-medium border-b border-border">{children}</th>,
                td: ({ children }) => <td className="px-3 py-2 border-b border-border/50 font-mono">{children}</td>,
              }}
            >
              {text}
            </ReactMarkdown>
          )
        }
      </div>

      {!loading && text && (
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? "Copié !" : "Copier"}
          </button>

          {onSave && (
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-blue transition-colors disabled:opacity-60"
            >
              {saved
                ? <><Check size={12} className="text-green-400" /> Sauvegardé</>
                : saving
                  ? <><Save size={12} className="animate-pulse" /> Sauvegarde…</>
                  : <><Save size={12} /> Sauvegarder la suggestion</>
              }
            </button>
          )}

          <span className="ml-auto text-[10px] text-muted/50">{text.length} caractères</span>
        </div>
      )}
    </div>
  );
}
