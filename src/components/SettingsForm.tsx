"use client";
import { useActionState } from "react";
import { saveSettingsAction } from "@/app/actions";
import type { Settings } from "@/lib/core/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
const input = "mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3";

export function SettingsForm({ settings: s }: { settings: Settings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, null);
  return (
    <form action={action} className="space-y-4">
      <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="font-semibold">People</h2>
        <Field label="Cook's name"><input name="cookName" defaultValue={s.cookName} className={input} /></Field>
        <Field label="Cook's WhatsApp number" hint="10-digit mobile; +91 is added automatically.">
          <input name="cookPhone" defaultValue={s.cookPhone} inputMode="tel" className={input} placeholder="98xxxxxxxx" />
        </Field>
        <Field label="Office grocer"><input name="grocerName" defaultValue={s.grocerName} className={input} /></Field>
        <Field label="Grocer phone"><input name="grocerPhone" defaultValue={s.grocerPhone} inputMode="tel" className={input} /></Field>
        <Field label="Household name" hint="Shown at the top of the grocer order."><input name="householdName" defaultValue={s.householdName} className={input} /></Field>
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="font-semibold">Planning</h2>
        <Field label="Usual number of people"><input name="servingsDefault" type="number" min={1} max={12} defaultValue={s.servingsDefault} className={input} /></Field>
        <Field label="Don't repeat a dish within (days)"><input name="noRepeatDays" type="number" min={3} max={21} defaultValue={s.noRepeatDays} className={input} /></Field>
        <label className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Tuesday top-up allowed</span><input type="checkbox" name="topupEnabled" defaultChecked={s.topupEnabled} className="h-6 w-6" /></label>
        <Field label="Items sold in both places (pav, sev, mushrooms…)">
          <select name="eitherGoesTo" defaultValue={s.eitherGoesTo} className={input}>
            <option value="blinkit">Order on Blinkit</option>
            <option value="grocer">Buy at the office grocer</option>
          </select>
        </Field>
        <label className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Blinkit search links</span><input type="checkbox" name="blinkitLinks" defaultChecked={s.blinkitLinks} className="h-6 w-6" /></label>
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="font-semibold">Reminders (India time)</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Draft next week on">
            <select name="draftDay" defaultValue={s.draftDay} className={input}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
          </Field>
          <Field label="at"><input name="draftTime" type="time" defaultValue={s.draftTime} className={input} /></Field>
        </div>
        <Field label="Friday reminder to approve, at"><input name="approveReminderTime" type="time" defaultValue={s.approveReminderTime} className={input} /></Field>
        <Field label="Nightly 'send tomorrow's menu', at"><input name="nightlyTime" type="time" defaultValue={s.nightlyTime} className={input} /></Field>
        <Field label="Dinner-change check, at" hint="Only notifies if tonight's dinner changed after the cook was told."><input name="dinnerCheckTime" type="time" defaultValue={s.dinnerCheckTime} className={input} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Top-up check on">
            <select name="topupCheckDay" defaultValue={s.topupCheckDay} className={input}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
          </Field>
          <Field label="at"><input name="topupCheckTime" type="time" defaultValue={s.topupCheckTime} className={input} /></Field>
        </div>
      </section>

      <button disabled={pending} className="h-14 w-full rounded-xl bg-brand text-lg font-semibold text-brand-ink disabled:opacity-50">
        {pending ? "Saving…" : state?.saved ? "Saved ✓" : "Save settings"}
      </button>
    </form>
  );
}
