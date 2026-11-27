import { motion } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { haptic } from "@/native/haptics";
import { canRefract, spring } from "@/ui/glass";

export const TABS = [
  { href: "/", label: "Today", icon: "M12 3v2.2M12 18.8V21M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M3 12h2.2M18.8 12H21M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6M12 16.4a4.4 4.4 0 100-8.8 4.4 4.4 0 000 8.8z" },
  { href: "/week", label: "Week", icon: "M7 3v3M17 3v3M3.8 9.2h16.4M5.6 5.2h12.8a1.8 1.8 0 011.8 1.8v11.2a1.8 1.8 0 01-1.8 1.8H5.6a1.8 1.8 0 01-1.8-1.8V7a1.8 1.8 0 011.8-1.8zM8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" },
  { href: "/shopping", label: "Shop", icon: "M5.2 8h13.6l-1.2 11.1a1.6 1.6 0 01-1.6 1.4H8a1.6 1.6 0 01-1.6-1.4zM9 8V6.6a3 3 0 016 0V8" },
  { href: "/dishes", label: "Dishes", icon: "M3.5 12.5h17a8.5 8.5 0 01-17 0zM8 9c0-1.5 1.5-1.5 1.5-3M12 9c0-1.5 1.5-1.5 1.5-3M16 9c0-1.5 1.5-1.5 1.5-3" },
  { href: "/settings", label: "Settings", icon: "M4 7h10M18 7h2M4 17h4M12 17h8M16 4.8v4.4M10 14.8v4.4" },
];

export function tabIndex(path: string) {
  const i = TABS.findIndex((t) => (t.href === "/" ? path === "/" : path.startsWith(t.href)));
  return i < 0 ? 0 : i;
}

/** Floating glass capsule. The active tab sits under a liquid lens that refracts the page behind it. */
export function BottomNav() {
  const path = useLocation().pathname;
  if (path.startsWith("/counter")) return null;
  const active = tabIndex(path);
  const onSend = path.startsWith("/send");
  return (
    <nav className="fixed inset-x-0 z-40 flex justify-center px-4" style={{ bottom: "calc(var(--sab) + 14px)" }}>
      <div className="glass-strong relative flex w-full max-w-[420px] items-center rounded-[30px] p-1.5" style={{ background: "var(--nav-bg)", boxShadow: "inset 0 1px 0 var(--glass-edge), 0 18px 40px -12px rgba(60,30,10,.35)" }}>
        {TABS.map((t, i) => {
          const isActive = i === active && !onSend;
          return (
            <Link
              key={t.href}
              to={t.href}
              onClick={() => { if (!isActive) haptic.select(); }}
              className="relative flex h-[58px] flex-1 flex-col items-center justify-center gap-0.5"
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-lens"
                  transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.8 }}
                  className={`liquid absolute inset-0 rounded-[24px] ${canRefract ? "refract" : ""}`}
                  style={{
                    background: "var(--lens-bg)",
                    border: "1px solid var(--lens-border)",
                    boxShadow: "inset 0 1px 1px rgba(255,255,255,.95), inset 0 -6px 12px -6px rgba(242,102,42,.25), 0 6px 18px -6px rgba(242,102,42,.45)",
                  }}
                />
              )}
              <motion.svg
                viewBox="0 0 24 24"
                className="relative z-10 h-[23px] w-[23px]"
                fill="none"
                stroke="currentColor"
                strokeWidth={isActive ? 2.1 : 1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{ scale: isActive ? 1.08 : 1, y: isActive ? -1 : 0, color: isActive ? "var(--brand)" : "var(--muted)" }}
                transition={spring}
                aria-hidden
              >
                <path d={t.icon} />
              </motion.svg>
              <motion.span
                className="relative z-10 text-[10.5px] font-semibold tracking-tight"
                animate={{ color: isActive ? "var(--brand)" : "var(--muted)" }}
              >
                {t.label}
              </motion.span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
