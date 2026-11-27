import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { logCookMessage } from "@/data/repo";
import { copyText, openExternal } from "@/native/device";
import { haptic } from "@/native/haptics";
import { spring } from "@/ui/glass";
import { WhatsAppIcon } from "./ui";

const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  return { x: Math.cos(a) * (70 + (i % 3) * 22), y: Math.sin(a) * (34 + (i % 4) * 9), c: ["#3ee07d", "#ffd166", "#ff8fab", "#9be7ff"][i % 4] };
});

/**
 * The big "Send on WhatsApp" button: logs what was sent (so the app knows whether the cook
 * is up to date), celebrates for a beat, then opens WhatsApp with the message filled in.
 */
export function SendToCook({
  label, text, link, kind, forDate, sentAt, compact, showPreview,
}: {
  label: string; text: string; link: string; kind: string; forDate: string | null;
  sentAt?: string | null; compact?: boolean; showPreview?: boolean;
}) {
  const [showText, setShowText] = useState(!!showPreview);
  const [copied, setCopied] = useState(false);
  const [burst, setBurst] = useState(0);

  async function send() {
    haptic.success();
    setBurst((b) => b + 1);
    await logCookMessage({ direction: "out", kind, forDate, text, withSnapshot: true });
    setTimeout(() => openExternal(link), 380);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={spring}
          onClick={send}
          className={`btn-wa relative flex w-full items-center justify-center gap-2.5 overflow-hidden font-bold tracking-[-0.01em] ${compact ? "h-[52px] rounded-[18px] text-[15px]" : "h-[64px] rounded-[24px] text-[18px]"}`}
        >
          {/* moving sheen */}
          <motion.span
            aria-hidden
            className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/25 blur-md"
            animate={{ x: ["0%", "420%"] }}
            transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={burst > 0 ? `sent-${burst}` : "idle"}
              initial={{ y: 14, opacity: 0, filter: "blur(4px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: -14, opacity: 0, filter: "blur(4px)" }}
              transition={spring}
              className="relative flex items-center gap-2.5"
            >
              <WhatsAppIcon className={compact ? "h-5 w-5" : "h-6 w-6"} />
              {burst > 0 ? "Opening WhatsApp…" : label}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <AnimatePresence>
          {burst > 0 && (
            <motion.div key={burst} className="pointer-events-none absolute inset-0 flex items-center justify-center" initial="a" animate="b" exit={{ opacity: 0 }}>
              {SPARKS.map((p, i) => (
                <motion.span
                  key={i}
                  className="absolute h-2 w-2 rounded-full"
                  style={{ background: p.c }}
                  variants={{ a: { x: 0, y: 0, scale: 0.4, opacity: 1 }, b: { x: p.x, y: p.y, scale: 0, opacity: 0 } }}
                  transition={{ duration: 0.7, ease: [0.2, 0.8, 0.3, 1] }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between px-1 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          {sentAt ? <><span className="inline-block h-1.5 w-1.5 rounded-full bg-ok" /> Sent {sentAt}</> : <><span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--faint)]" /> Not sent yet</>}
        </span>
        <span className="flex gap-4 font-semibold">
          <button onClick={() => { haptic.select(); setShowText((s) => !s); }}>{showText ? "Hide" : "Preview"}</button>
          <button onClick={async () => { haptic.tap(); await copyText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied ✓" : "Copy"}</button>
        </span>
      </div>
      <AnimatePresence initial={false}>
        {showText && (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="glass selectable overflow-hidden whitespace-pre-wrap rounded-[20px] px-4 py-3 font-sans text-[14px] leading-relaxed"
          >
            {text}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}
