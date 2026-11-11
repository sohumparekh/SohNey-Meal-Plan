"use client";
import { useState, useTransition } from "react";
import { logSentAction } from "@/app/actions";
import { WhatsAppIcon } from "./ui";

/**
 * Big "send on WhatsApp" button. Logs what was sent (so the app can tell later whether
 * the cook has the latest menu), then opens WhatsApp with the text prefilled.
 */
export function SendToCook({
  label, text, link, kind, forDate, sentAt, compact,
}: { label: string; text: string; link: string; kind: string; forDate: string; sentAt?: string | null; compact?: boolean }) {
  const [pending, start] = useTransition();
  const [showText, setShowText] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => start(() => logSentAction(kind, forDate, text))}
        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-wa font-semibold text-white active:opacity-80 ${compact ? "h-12 text-base" : "h-14 text-lg"}`}
      >
        <WhatsAppIcon />
        {pending ? "Opening…" : label}
      </a>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{sentAt ? `Last sent ${sentAt}` : "Not sent yet"}</span>
        <span className="flex gap-3">
          <button className="underline" onClick={() => setShowText((s) => !s)}>{showText ? "Hide" : "Preview"}</button>
          <button
            className="underline"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </span>
      </div>
      {showText && <pre className="whitespace-pre-wrap rounded-xl bg-soft p-3 font-sans text-sm leading-relaxed">{text}</pre>}
    </div>
  );
}
