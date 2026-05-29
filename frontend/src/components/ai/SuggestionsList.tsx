"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { Suggestion } from "@/lib/api";

interface Props {
  suggestions: Suggestion[];
  onDelete: (id: string) => void;
}

function SuggestionItem({ s, onDelete }: { s: Suggestion; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    onDelete(s.id);
  };

  const date = new Date(s.saved_at).toLocaleString("fr-CA", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ink transition-colors text-left"
      >
        {open ? <ChevronDown size={14} className="text-muted flex-shrink-0" /> : <ChevronRight size={14} className="text-muted flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-text truncate">
            {s.template || "Prompt libre"}
          </div>
          <div className="text-[10px] text-muted mt-0.5">{date}</div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1 text-muted hover:text-red-400 transition-colors disabled:opacity-40"
          title="Supprimer"
          aria-label="Supprimer cette suggestion"
        >
          <Trash2 size={12} />
        </button>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border/50 space-y-3">
          <div className="mt-3">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Prompt</div>
            <div className="text-xs text-muted bg-bg rounded p-2 font-mono whitespace-pre-wrap">{s.prompt}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Réponse Claude</div>
            <div className="text-xs text-text bg-bg rounded p-2 font-mono whitespace-pre-wrap leading-relaxed">{s.response}</div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(s.response)}
            className="text-xs text-muted hover:text-text transition-colors"
          >
            Copier la réponse
          </button>
        </div>
      )}
    </div>
  );
}

export default function SuggestionsList({ suggestions, onDelete }: Props) {
  if (!suggestions.length) {
    return (
      <div className="text-center py-6 text-muted text-xs border border-dashed border-border rounded-lg">
        Aucune suggestion sauvegardée pour cette stratégie.<br />
        <span className="opacity-60">Utilisez "Sauvegarder la suggestion" après une analyse Claude.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted uppercase tracking-wider mb-3">
        {suggestions.length} suggestion{suggestions.length > 1 ? "s" : ""} sauvegardée{suggestions.length > 1 ? "s" : ""}
      </div>
      {suggestions.map((s) => (
        <SuggestionItem key={s.id} s={s} onDelete={onDelete} />
      ))}
    </div>
  );
}
