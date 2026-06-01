"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export default function AccordionSection({ id, title, subtitle, badge, defaultOpen = true, children }: Props) {
  const storageKey = `accordion:${id}`;
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === "open") setOpen(true);
      else if (v === "closed") setOpen(false);
    } catch {}
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, open ? "open" : "closed");
    } catch {}
  }, [open, hydrated, storageKey]);

  return (
    <section className="bg-surface border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg/40 transition-colors text-left"
        aria-expanded={open}
        aria-controls={`${id}-content`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronDown
            size={16}
            className={`text-muted transition-transform shrink-0 ${open ? "rotate-0" : "-rotate-90"}`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text truncate">{title}</h2>
            {subtitle && <p className="text-xs text-muted mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </button>
      {open && (
        <div id={`${id}-content`} className="border-t border-border p-4">
          {children}
        </div>
      )}
    </section>
  );
}
