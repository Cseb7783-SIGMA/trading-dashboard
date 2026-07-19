"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutList,
  Scale,
  Sparkles,
  BookOpen,
  Eye,
  Briefcase,
  Building2,
  Trophy,
  FlaskConical,
  Activity,
  Layers,
  Newspaper,
  History,
  Target,
  LayoutGrid,
  Microscope,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import clsx from "clsx";
import ThemeToggle from "./ThemeToggle";

type NavItem = {
  href: string;
  label: string;
  Icon: typeof LayoutList;
  badge?: string;
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

const V2_ITEMS: NavItem[] = [
  { href: "/v2/lecture-marche", label: "Lecture du marché", Icon: Newspaper },
  { href: "/v2/tendances-marche", label: "Tendances du marché", Icon: TrendingUp },
  { href: "/v2/historique", label: "Historique des lectures", Icon: History },
  { href: "/v2/resultats", label: "Résultats / Forward", Icon: Target },
  { href: "/v2/resultats-detailles", label: "Résultats détaillés", Icon: Microscope },
  { href: "/v2/lecture-detaillee", label: "Lecture détaillée", Icon: LayoutGrid },
];

const INTERNAL_GROUPS: NavGroup[] = [
  {
    title: "R&D",
    items: [
      { href: "/",        label: "Laboratoire",  Icon: LayoutList   },
      { href: "/paper",   label: "Paper Trade",  Icon: FlaskConical },
      { href: "/compare", label: "Comparer",     Icon: Scale        },
    ],
  },
  {
    title: "Destinations",
    items: [
      { href: "/journal", label: "Journal", Icon: BookOpen },
      { href: "/personal-broker", label: "Personal Broker", Icon: Briefcase, badge: "NEW" },
      { href: "/propfirm",        label: "PropFirm",        Icon: Building2 },
      { href: "/challenge-z",     label: "Challenge Z",     Icon: Trophy    },
    ],
  },
  {
    title: "Auto-Trading",
    items: [
      { href: "/multi-strategies", label: "Multi-Stratégies", Icon: Layers,   badge: "SOON" },
      { href: "/live-agents",      label: "Agents LLM",       Icon: Activity },
    ],
  },
  {
    title: "Recherche IA",
    items: [
      { href: "/ai",          label: "Assistant IA", Icon: Sparkles },
      { href: "/scout-watch", label: "Scout Watch",  Icon: Eye      },
    ],
  },
  {
    title: "Opérations",
    items: [
      { href: "/usage-claude", label: "Usage Claude", Icon: Sparkles, badge: "NEW" },
    ],
  },
];

function NavLinks({ items, path }: { items: NavItem[]; path: string }) {
  return items.map(({ href, label, Icon, badge }) => {
    const active = path === href || (href !== "/" && path.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={clsx(
          "flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors duration-150 relative",
          active ? "bg-blue/10 text-blue font-medium" : "text-muted hover:text-text hover:bg-ink"
        )}
      >
        <Icon size={15} strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
        <span className="flex-1">{label}</span>
        {badge && (
          <span className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue/20 text-blue uppercase">
            {badge}
          </span>
        )}
      </Link>
    );
  });
}

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="text-xs font-semibold tracking-widest text-blue uppercase mb-0.5">Trading Lab</div>
        <div className="text-[11px] text-muted">Dashboard · Sébastien Caron</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-3 overflow-y-auto" aria-label="Navigation principale">
        <div className="space-y-1">
          <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted/70 uppercase">
            V2 — Prototype
          </div>
          <NavLinks items={V2_ITEMS} path={path} />
        </div>

        <details className="group" defaultOpen={!path.startsWith("/v2/")}>
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[10px] font-semibold tracking-wider text-muted/70 uppercase hover:text-text">
            <ChevronDown size={13} className="transition-transform group-open:rotate-180" aria-hidden="true" />
            Lab interne
          </summary>
          <div className="space-y-3 pt-1">
            {INTERNAL_GROUPS.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {group.title && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted/70 uppercase">
                    {group.title}
                  </div>
                )}
                <NavLinks items={group.items} path={path} />
              </div>
            ))}
          </div>
        </details>
      </nav>

      {/* Theme toggle */}
      <div className="px-3 py-2 border-t border-border">
        <ThemeToggle />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-[10px] text-muted/60 leading-relaxed">
          Ottawa, Ontario<br />Canada
        </div>
      </div>
    </aside>
  );
}
