"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutList, Scale, Sparkles, BookOpen, Eye } from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/",            label: "Overview",     Icon: LayoutList },
  { href: "/compare",     label: "Comparer",     Icon: Scale      },
  { href: "/ai",          label: "Assistant IA", Icon: Sparkles   },
  { href: "/journal",     label: "Journal",      Icon: BookOpen   },
  { href: "/scout-watch", label: "Scout Watch",  Icon: Eye        },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-52 flex-shrink-0 bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="text-xs font-semibold tracking-widest text-blue uppercase mb-0.5">Trading Lab</div>
        <div className="text-[11px] text-muted">Dashboard · Sébastien Caron</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1" aria-label="Navigation principale">
        {NAV.map(({ href, label, Icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors duration-150",
                active
                  ? "bg-blue/10 text-blue font-medium"
                  : "text-muted hover:text-text hover:bg-ink"
              )}
            >
              <Icon size={15} strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-[10px] text-muted/60 leading-relaxed">
          Ottawa, Ontario<br />Canada
        </div>
      </div>
    </aside>
  );
}
