import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { haptic } from "@/native/haptics";
import { Glass, rise, spring } from "@/ui/glass";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Glass variants={rise} className={`p-4 ${className}`}>
      {children}
    </Glass>
  );
}

export function Banner({ children, tone = "warn" }: { children: React.ReactNode; tone?: "warn" | "info" }) {
  return (
    <motion.div
      variants={rise}
      className={`glass rounded-[22px] px-4 py-3 text-[14px] leading-snug ${tone === "warn" ? "text-warn-ink" : "text-ink"}`}
      style={tone === "warn" ? { background: "linear-gradient(135deg, rgba(255,196,77,.38), rgba(255,170,60,.16))" } : undefined}
    >
      {children}
    </motion.div>
  );
}

/** Large title, iOS style. */
export function PageTitle({ title, sub, right }: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <motion.header variants={rise} className="mb-1 flex items-end justify-between gap-3 pt-1">
      <div className="min-w-0">
        {sub && <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{sub}</p>}
        <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.035em]">{title}</h1>
      </div>
      {right}
    </motion.header>
  );
}

export function Pill({ children, active, href }: { children: React.ReactNode; active?: boolean; href: string }) {
  return (
    <Link to={href} onClick={() => haptic.select()} className="relative shrink-0">
      <motion.span
        whileTap={{ scale: 0.94 }}
        transition={spring}
        className={`flex h-10 items-center rounded-full px-4 text-[14px] font-semibold ${active ? "btn-brand" : "btn-glass text-ink"}`}
      >
        {children}
      </motion.span>
    </Link>
  );
}

export const SLOT_LABEL = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" } as const;
export const SLOT_EMOJI = { breakfast: "☀️", lunch: "🍛", dinner: "🌙" } as const;

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.9 11.9 0 004.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 001.8-1.3 2.3 2.3 0 00.2-1.3c-.1-.1-.2-.2-.5-.3z" />
    </svg>
  );
}
