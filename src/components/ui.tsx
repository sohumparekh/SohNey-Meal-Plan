import { Link } from "react-router-dom";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-card p-4 shadow-sm ${className}`}>{children}</section>;
}

export function Banner({ children, tone = "warn" }: { children: React.ReactNode; tone?: "warn" | "info" }) {
  return (
    <div className={`rounded-xl px-4 py-3 text-sm ${tone === "warn" ? "bg-warn-bg text-warn-ink" : "bg-soft text-ink"}`}>{children}</div>
  );
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </header>
  );
}

export function Pill({ children, active, href }: { children: React.ReactNode; active?: boolean; href: string }) {
  return (
    <Link
      to={href}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${active ? "bg-brand text-brand-ink" : "border border-line bg-card text-ink"}`}
    >
      {children}
    </Link>
  );
}

export const SLOT_LABEL = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" } as const;

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.9 11.9 0 004.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 001.8-1.3 2.3 2.3 0 00.2-1.3c-.1-.1-.2-.2-.5-.3z" />
    </svg>
  );
}
