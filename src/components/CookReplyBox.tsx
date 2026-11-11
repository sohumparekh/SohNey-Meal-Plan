"use client";
import { useState, useTransition } from "react";
import { cookReplyAction } from "@/app/actions";

/** Phase 1: paste what the cook replied ("paneer khatam") and the app acts on it. */
export function CookReplyBox({ cookName }: { cookName: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="font-semibold">{cookName} replied?</h2>
      <p className="mb-2 text-sm text-muted">Paste or type her message, e.g. &quot;paneer khatam&quot;. Missing items go on the top-up and the meal switches to Plan B.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="w-full rounded-xl border border-line bg-bg p-3"
        placeholder="paneer khatam"
      />
      <button
        disabled={pending || !text.trim()}
        onClick={() => start(async () => { const r = await cookReplyAction(text); setResult(r.message); if (r.intent !== "unknown") setText(""); })}
        className="mt-2 h-11 w-full rounded-xl bg-brand font-semibold text-brand-ink disabled:opacity-50"
      >
        {pending ? "Reading…" : "Apply"}
      </button>
      {result && <p className="mt-2 rounded-lg bg-soft p-3 text-sm">{result}</p>}
    </section>
  );
}
