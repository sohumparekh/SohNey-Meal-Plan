import { useState } from "react";
import { getPlannerData, logCookMessage, reportMissing } from "@/data/repo";
import { parseCookReply } from "@/lib/core/cookMessages";
import { todayIST } from "@/lib/core/dates";

/** Paste or type what the cook replied ("paneer khatam"); the app acts on it. */
export function CookReplyBox({ cookName }: { cookName: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function apply() {
    const data = await getPlannerData();
    const parsed = parseCookReply(text, data);
    await logCookMessage({ direction: "in", kind: "reply", forDate: todayIST(), text });
    if (parsed.intent === "missing" && parsed.ingredientIds.length) {
      const switched = await reportMissing(data, parsed.ingredientIds);
      const names = parsed.ingredientIds.map((id) => data.ingredients[id].nameEn).join(", ");
      setResult(
        `${names} added to the top-up list.` +
          (switched.length ? ` Switched to Plan B: ${switched.map((m) => data.dishes[m.dishId].nameEn).join(", ")}.` : " No meal in the next 2 days needs it."),
      );
      setText("");
    } else if (parsed.intent === "missing") {
      setResult("Couldn't tell which item. Type just the item and 'khatam', e.g. \"paneer khatam\".");
    } else if (parsed.intent === "ok") {
      setResult("She confirmed. Nothing to do.");
      setText("");
    } else if (parsed.intent === "plan_b") {
      setResult("She is making Plan B. Tell me which item ran out to add it to the top-up.");
    } else {
      setResult("Couldn't tell what she means. Use the buttons on the meal instead.");
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="font-semibold">{cookName} replied?</h2>
      <p className="mb-2 text-sm text-muted">Paste or type her message, e.g. &quot;paneer khatam&quot;. Missing items go on the top-up and the meal switches to Plan B.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="w-full rounded-xl border border-line bg-bg p-3" placeholder="paneer khatam" />
      <button disabled={!text.trim()} onClick={apply} className="mt-2 h-11 w-full rounded-xl bg-brand font-semibold text-brand-ink disabled:opacity-50">
        Apply
      </button>
      {result && <p className="mt-2 rounded-lg bg-soft p-3 text-sm">{result}</p>}
    </section>
  );
}
