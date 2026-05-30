"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X, ArrowUp, MessageCircle } from "lucide-react";

// Routes où l'assistant IA contextuel est CACHÉ (section Recherche a sa propre page Assistant IA)
const HIDDEN_ROUTES = ["/ai", "/scout-watch"];

type PageContext = {
  label: string;
  subtitle: string;
  suggestedQuestions: string[];
};

function getContext(pathname: string): PageContext {
  if (pathname === "/") {
    return {
      label: "Laboratoire",
      subtitle: "Pipeline complet · toutes catégories",
      suggestedQuestions: [
        "Quelle stratégie est prête à passer en Paper ?",
        "Combien de stratégies en R&D actuellement ?",
        "Pourquoi peu de stratégies en Broker Ready ?",
        "Quelle catégorie performe le mieux ?",
      ],
    };
  }
  if (pathname === "/paper") {
    return {
      label: "Paper Trade",
      subtitle: "Validation forward live",
      suggestedQuestions: [
        "Quelle stratégie transférer en premier ?",
        "Pourquoi V1.E drift ?",
        "Sample suffisant pour les 3 stratégies ?",
        "Quel est le delta moyen actuel ?",
      ],
    };
  }
  if (pathname === "/personal-broker") {
    return {
      label: "Personal Broker",
      subtitle: "Compte perso · IBKR",
      suggestedQuestions: [
        "Quel capital allouer pour démarrer ?",
        "Quelle stratégie activer en premier ?",
        "Risk per trade optimal ?",
        "Quel DD max viser ?",
      ],
    };
  }
  if (pathname === "/propfirm") {
    return {
      label: "PropFirm",
      subtitle: "Challenges externes FTMO etc.",
      suggestedQuestions: [
        "Quelle stratégie pour Phase 1 FTMO ?",
        "Respecte-t-on les 10% DD ?",
        "Sample minimum pour qualifier ?",
        "Sizing optimal sur 100k$ ?",
      ],
    };
  }
  if (pathname === "/challenge-z") {
    return {
      label: "Challenge Z",
      subtitle: "TMAFX Climb",
      suggestedQuestions: [
        "Quelle stratégie pour Climb Z ?",
        "Compatible TMAFX règles ?",
        "Quel ConsW / ConsL est respecté ?",
        "Probabilité de pass ?",
      ],
    };
  }
  if (pathname.startsWith("/strategy/")) {
    return {
      label: "Stratégie",
      subtitle: "Détail run",
      suggestedQuestions: [
        "Pourquoi le delta PF est négatif ?",
        "Sizing pour PropFirm FTMO ?",
        "Risques avant transfert live ?",
        "Comparer avec d'autres variantes ?",
      ],
    };
  }
  return {
    label: "Assistant",
    subtitle: pathname,
    suggestedQuestions: [],
  };
}

type Message = { role: "user" | "assistant"; content: string };

export default function AIAssistantDrawer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);

  // Reset messages si on change de page
  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [pathname]);

  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;

  const ctx = getContext(pathname);

  const send = (text: string) => {
    if (!text.trim()) return;
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setThinking(true);

    // Placeholder simulation — vrai endpoint /ai/ask à venir Phase 2 D-033
    setTimeout(() => {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "Endpoint LLM contextuel à venir (Phase 2 D-033). Pour l'instant l'Assistant IA général est dans la sidebar → Recherche → Assistant IA.",
        },
      ]);
      setThinking(false);
    }, 600);
  };

  return (
    <>
      {/* FAB trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue text-white shadow-lg hover:shadow-xl hover:bg-blue/90 transition-all"
          aria-label="Ouvrir l'Assistant IA contextuel"
        >
          <Sparkles size={15} />
          <span className="text-sm font-medium">Demander à l'IA</span>
        </button>
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-surface border-l border-border z-50 shadow-2xl transition-transform duration-300 flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Assistant IA contextuel"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-blue" />
              <strong className="text-sm font-medium">Assistant IA</strong>
            </div>
            <div className="text-[10px] text-muted mt-0.5">
              Contexte : {ctx.label} · {ctx.subtitle}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-muted hover:text-text p-1"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Suggested questions (seulement si pas de conversation) */}
        {messages.length === 0 && ctx.suggestedQuestions.length > 0 && (
          <div className="px-4 py-3 border-b border-border bg-ink/40">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
              Questions suggérées
            </div>
            <div className="flex flex-col gap-1.5">
              {ctx.suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q)}
                  className="text-[11px] text-left px-2.5 py-1.5 rounded border border-border bg-surface hover:border-blue/40 hover:bg-blue/5 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && ctx.suggestedQuestions.length === 0 && (
            <div className="flex items-center justify-center h-full text-xs text-muted text-center">
              <MessageCircle size={28} strokeWidth={1} className="text-border mb-2" />
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="bg-blue/15 text-blue px-3 py-1.5 rounded-2xl rounded-tr-sm text-xs max-w-[85%]">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="bg-ink text-text px-3 py-1.5 rounded-2xl rounded-tl-sm text-xs max-w-[85%] leading-relaxed">
                  {m.content}
                </div>
              </div>
            )
          )}
          {thinking && (
            <div className="flex justify-start">
              <div className="bg-ink text-muted px-3 py-1.5 rounded-2xl rounded-tl-sm text-xs italic">
                ...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 bg-ink rounded-lg px-3 py-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pose une question sur cette page…"
              className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="text-blue disabled:text-muted disabled:cursor-not-allowed"
              aria-label="Envoyer"
            >
              <ArrowUp size={14} />
            </button>
          </form>
          <div className="text-[9px] text-muted/70 mt-1.5 text-center">
            Connaît {ctx.label} + library + tripwires + objectifs Challenge Z / FTMO
          </div>
        </div>
      </div>

      {/* Overlay click-to-close */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/30 z-40"
          aria-hidden="true"
        />
      )}
    </>
  );
}
