import { useState } from "react";
import { logCookMessage } from "@/data/repo";
import { copyText, openExternal } from "@/native/device";
import { WhatsAppIcon } from "./ui";

/**
 * The big "Send on WhatsApp" button: opens WhatsApp with the message filled in (one tap
 * to send there) and logs what was sent, so the app knows whether the cook is up to date.
 */
export function SendToCook({
  label, text, link, kind, forDate, sentAt, compact, showPreview,
}: {
  label: string; text: string; link: string; kind: string; forDate: string | null;
  sentAt?: string | null; compact?: boolean; showPreview?: boolean;
}) {
  const [showText, setShowText] = useState(!!showPreview);
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <button
        onClick={async () => {
          await logCookMessage({ direction: "out", kind, forDate, text, withSnapshot: true });
          await openExternal(link);
        }}
        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-wa font-semibold text-white active:opacity-80 ${compact ? "h-12 text-base" : "h-16 text-lg"}`}
      >
        <WhatsAppIcon />
        {label}
      </button>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{sentAt ? `Last sent ${sentAt}` : "Not sent yet"}</span>
        <span className="flex gap-3">
          <button className="underline" onClick={() => setShowText((s) => !s)}>{showText ? "Hide" : "Preview"}</button>
          <button className="underline" onClick={async () => { await copyText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? "Copied" : "Copy"}
          </button>
        </span>
      </div>
      {showText && <pre className="whitespace-pre-wrap rounded-xl bg-soft p-3 font-sans text-sm leading-relaxed">{text}</pre>}
    </div>
  );
}
