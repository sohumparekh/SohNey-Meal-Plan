"use client";
import { useActionState } from "react";
import { loginAction } from "@/app/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <input
        name="passcode"
        type="password"
        autoComplete="current-password"
        placeholder="Passcode"
        className="h-14 w-full rounded-xl border border-line bg-card px-4 text-lg"
        autoFocus
      />
      {state?.error && <p className="text-sm text-warn-ink">{state.error}</p>}
      <button disabled={pending} className="h-14 w-full rounded-xl bg-brand text-lg font-semibold text-brand-ink disabled:opacity-50">
        {pending ? "Checking…" : "Open"}
      </button>
    </form>
  );
}
