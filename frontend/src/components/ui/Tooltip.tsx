"use client";
import { useState, useRef } from "react";
import { Info } from "lucide-react";

interface Props {
  label: string;
  text: string;
}

export default function Tooltip({ label, text }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<SVGSVGElement>(null);

  const show = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
  };

  const hide = () => setPos(null);

  return (
    <>
      <Info
        ref={ref}
        size={11}
        className="text-muted/40 hover:text-blue cursor-help flex-shrink-0 transition-colors"
        onMouseEnter={show}
        onMouseLeave={hide}
        aria-label={text}
      />
      {pos && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: pos.x, top: pos.y - 8, transform: "translate(-50%, -100%)" }}
        >
          <div className="bg-ink border border-border rounded-lg px-3 py-2 shadow-xl w-64">
            <div className="text-xs font-semibold text-text mb-1">{label}</div>
            <div className="text-[11px] text-muted leading-relaxed">{text}</div>
          </div>
          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-ink border-r border-b border-border rotate-45 -mt-1" />
          </div>
        </div>
      )}
    </>
  );
}
