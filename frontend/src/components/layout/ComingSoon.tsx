"use client";
import { LucideIcon, Construction } from "lucide-react";
import Link from "next/link";

type Props = {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  targetSession: string;
  description: string;
  milestones?: string[];
  relatedLink?: { href: string; label: string };
};

export default function ComingSoon({
  title,
  subtitle,
  Icon,
  targetSession,
  description,
  milestones,
  relatedLink,
}: Props) {
  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Icon size={26} className="text-blue" />
          <h1 className="text-2xl font-semibold">{title}</h1>
          <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded bg-orange/20 text-orange uppercase border border-orange/30">
            Coming {targetSession}
          </span>
        </div>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-surface">
        <Construction size={18} className="text-orange mt-0.5 flex-shrink-0" />
        <div className="text-sm text-text2 leading-relaxed">{description}</div>
      </div>

      {milestones && milestones.length > 0 && (
        <section className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Milestones avant ouverture</h3>
          <ol className="text-xs text-muted space-y-1.5 list-decimal list-inside leading-relaxed">
            {milestones.map((m, i) => (
              <li key={i}><span className="text-text">{m}</span></li>
            ))}
          </ol>
        </section>
      )}

      {relatedLink && (
        <div className="text-xs text-muted">
          En attendant, voir :{" "}
          <Link href={relatedLink.href} className="text-blue hover:underline">
            {relatedLink.label}
          </Link>
        </div>
      )}
    </main>
  );
}
