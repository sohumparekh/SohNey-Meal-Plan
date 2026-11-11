"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/week", label: "Week", icon: "M4 6h16M4 6v14h16V6M8 3v6M16 3v6M4 11h16" },
  { href: "/shopping", label: "Shopping", icon: "M5 7h14l-1.5 12h-11zM9 7a3 3 0 016 0" },
  { href: "/dishes", label: "Dishes", icon: "M4 13h16a8 8 0 01-16 0zM12 4v5M8 6l1 3M16 6l-1 3" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" },
];

export function BottomNav() {
  const path = usePathname();
  if (path.startsWith("/login") || path.startsWith("/counter")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-xl">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? "text-brand" : "text-muted"}`}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
