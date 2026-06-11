"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { FileText } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type BriefMeta = { name: string; date: string; summary: string; chars: number };

export default function ScoutBriefsTab() {
  const [briefs, setBriefs] = useState<BriefMeta[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/scout/briefs`)
      .then((r) => r.json())
      .then((d) => { const b: BriefMeta[] = d.briefs || []; setBriefs(b); if (b.length) setSel(b[0].name); })
      .catch((e) => setErr(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sel) return;
    setContent("");
    fetch(`${API}/scout/briefs/${encodeURIComponent(sel)}`)
      .then((r) => r.json())
      .then((d) => setContent(d.content || ""))
      .catch((e) => setErr(String(e?.message || e)));
  }, [sel]);

  if (loading) return <div className="text-xs text-muted p-4">Chargement des briefs…</div>;
  if (err) return <div className="text-xs text-red-500 p-4">Erreur : {err}</div>;
  if (!briefs.length) return <div className="text-xs text-muted p-4">Aucun brief Scout pour l'instant. Le Scout en génère un par run (≈16h, jours de bourse).</div>;

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-4">
      <div className="space-y-1.5">
        {briefs.map((b) => (
          <button
            key={b.name}
            onClick={() => setSel(b.name)}
            className={`w-full text-left rounded-md px-3 py-2 border ${sel === b.name ? "border-blue border-2" : "border-border"} bg-surface hover:border-blue/50 transition-colors`}
          >
            <div className="text-sm font-medium flex items-center gap-2"><FileText size={13} /> {b.date}</div>
            <div className="text-[11px] text-muted mt-0.5" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{b.summary}</div>
          </button>
        ))}
      </div>
      <div className="bg-surface border border-border rounded-lg p-5 overflow-auto text-sm leading-relaxed markdown-body" style={{ maxHeight: "72vh" }}>
        <ReactMarkdown
          components={{
            h1: ({children}) => <h1 className="text-lg font-semibold mt-4 mb-2">{children}</h1>,
            h2: ({children}) => <h2 className="text-base font-semibold mt-4 mb-2 text-blue">{children}</h2>,
            h3: ({children}) => <h3 className="text-sm font-semibold mt-3 mb-1">{children}</h3>,
            p: ({children}) => <p className="mb-2">{children}</p>,
            ul: ({children}) => <ul className="list-disc ml-5 mb-2 space-y-1">{children}</ul>,
            ol: ({children}) => <ol className="list-decimal ml-5 mb-2 space-y-1">{children}</ol>,
            code: ({children}) => <code className="bg-surface-hover px-1 py-0.5 rounded text-[12px]">{children}</code>,
            table: ({children}) => <table className="text-[12px] border-collapse my-2">{children}</table>,
            th: ({children}) => <th className="border border-border px-2 py-1 text-left">{children}</th>,
            td: ({children}) => <td className="border border-border px-2 py-1">{children}</td>,
          }}
        >{content}</ReactMarkdown>
      </div>
    </div>
  );
}
