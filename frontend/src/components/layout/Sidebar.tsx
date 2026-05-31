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

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Général",
    items: [
      { href: "/",        label: "Laboratoire",  Icon: LayoutList   },
      { href: "/paper",   label: "Paper Trade",  Icon: FlaskConical },
      { href: "/journal", label: "Journal",      Icon: BookOpen     },
      { href: "/compare", label: "Comparer",     Icon: Scale        },
    ],
  },
  {
    title: "Destinations",
    items: [
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
    title: "Recherche",
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
        {NAV_GROUPS.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {group.title && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted/70 uppercase">
                {group.title}
              </div>
            )}
            {group.items.map(({ href, label, Icon, badge }) => {
              const active = path === href || (href !== "/" && path.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors duration-150 relative",
                    active
                      ? "bg-blue/10 text-blue font-medium"
                      : "text-muted hover:text-text hover:bg-ink"
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
            })}
          </div>
        ))}
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
