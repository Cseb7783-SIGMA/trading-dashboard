"use client";
import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";

export default function ActivationToast() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("activation_toast");
      if (!raw) return;
      const data = JSON.parse(raw);
      // Expirer après 10 secondes pour éviter qu'un vieux toast reste affiché
      if (Date.now() - (data.at ?? 0) > 10000) {
        sessionStorage.removeItem("activation_toast");
        return;
      }
      setMsg(data.msg);
      sessionStorage.removeItem("activation_toast");
      // Auto-dismiss après 5s
      const timer = setTimeout(() => setMsg(null), 5000);
      return () => clearTimeout(timer);
    } catch {}
  }, []);

  if (!msg) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-surface border border-green-300 rounded-lg shadow-lg px-4 py-3 flex items-start gap-2.5 max-w-md animate-in slide-in-from-bottom-2">
      <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm text-text">
        <div className="font-medium text-green-700">Activation réussie</div>
        <div className="text-xs text-muted mt-0.5">{msg}</div>
      </div>
      <button
        onClick={() => setMsg(null)}
        className="text-muted hover:text-text shrink-0"
        aria-label="Fermer"
      >
        <X size={14} />
      </button>
    </div>
  );
}
