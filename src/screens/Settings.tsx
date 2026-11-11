import { useEffect, useRef, useState } from "react";
import { compareWithLocal, importAll, parseHouseholdFile } from "@/data/backup";
import { getMeta } from "@/data/db";
import { getSettings, recentMessages, saveSettings } from "@/data/repo";
import { nowIST, prettyDate } from "@/lib/core/dates";
import type { CookLanguage, Settings } from "@/lib/core/types";
import { isNative, sharePlanFile, writeBackup } from "@/native/device";
import { askNotificationPermission, openExactAlarmSetting, reminderStatus, rescheduleReminders, type ReminderStatus } from "@/native/reminders";
import { sentLabel, useLive } from "./view";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const input = "mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3";
const section = "space-y-3 rounded-2xl border border-line bg-card p-4";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function SettingsScreen() {
  const settings = useLive(getSettings);
  const meta = useLive(async () => ({
    lastBackupAt: await getMeta<string | null>("lastBackupAt", null),
    lastBackupWhere: await getMeta<string | null>("lastBackupWhere", null),
    lastExportAt: await getMeta<string | null>("lastExportAt", null),
    lastImportAt: await getMeta<string | null>("lastImportAt", null),
    updatedAt: await getMeta<string | null>("updatedAt", null),
    messages: await recentMessages(12),
  }));
  if (!settings || !meta) return null;
  return (
    <div className="space-y-4 pb-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <Reminders />
      <SettingsForm s={settings} />
      <DataSection meta={meta} />
      <section className={section}>
        <h2 className="font-semibold">Messages with the cook</h2>
        {meta.messages.length === 0 && <p className="text-sm text-muted">Nothing yet.</p>}
        <ul className="space-y-2 text-sm">
          {meta.messages.map((m) => (
            <li key={m.id} className="rounded-lg bg-soft p-2">
              <div className="text-xs text-muted">{m.direction === "out" ? "Sent" : "Reply"} · {m.kind} · {sentLabel(m.createdAt)}</div>
              <div className="line-clamp-3 whitespace-pre-wrap">{m.text}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Reminders() {
  const [st, setSt] = useState<ReminderStatus | null>(null);
  const refresh = () => reminderStatus().then(setSt);
  useEffect(() => {
    refresh();
    const onVis = () => document.visibilityState === "visible" && rescheduleReminders().then(setSt); // back from system settings
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  if (!st) return null;
  const fmt = (iso: string | null) => (iso ? `${prettyDate(nowIST(new Date(iso)).date)} ${nowIST(new Date(iso)).hhmm}` : "none");
  return (
    <section className={section}>
      <h2 className="font-semibold">Reminders</h2>
      {!st.supported && <p className="text-sm text-muted">Reminders work in the installed Android app.</p>}
      {st.supported && st.permission !== "granted" && (
        <>
          <p className="rounded-lg bg-warn-bg p-3 text-sm text-warn-ink">Notifications are off, so no reminders will show.</p>
          <button onClick={async () => { await askNotificationPermission(); setSt(await rescheduleReminders()); }} className="h-12 w-full rounded-xl bg-brand font-semibold text-brand-ink">
            Allow notifications
          </button>
          {st.permission === "denied" && <p className="text-xs text-muted">If nothing happens: phone Settings → Apps → Ghar ka Menu → Notifications → Allow.</p>}
        </>
      )}
      {st.supported && st.permission === "granted" && (
        <>
          {st.exact === "granted" ? (
            <p className="text-sm text-ok">✓ Exact timing on. Reminders come at the set minute.</p>
          ) : (
            <>
              <p className="rounded-lg bg-warn-bg p-3 text-sm text-warn-ink">
                Exact alarms are not allowed, so Android may deliver reminders a few minutes late (sometimes more when the phone is idle).
              </p>
              <button onClick={() => openExactAlarmSetting()} className="h-12 w-full rounded-xl bg-brand font-semibold text-brand-ink">Allow exact reminders</button>
              <p className="text-xs text-muted">Opens &quot;Alarms &amp; reminders&quot;. Turn it on for Ghar ka Menu, then come back.</p>
            </>
          )}
          <p className="text-sm text-muted">{st.scheduled} reminders set. Next: {fmt(st.next)}. Set until {fmt(st.until)}; opening the app extends this.</p>
        </>
      )}
    </section>
  );
}

function SettingsForm({ s }: { s: Settings }) {
  const [f, setF] = useState(s);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => { setF({ ...f, [k]: v }); setSaved(false); };
  const time = (k: "dailyMenuTime" | "dinnerCheckTime" | "planWeekTime" | "groceryTime") => (
    <input type="time" value={f[k]} onChange={(e) => /^\d{2}:\d{2}$/.test(e.target.value) && set(k, e.target.value)} className={input} />
  );
  const day = (k: "planWeekDay" | "groceryDay") => (
    <select value={f[k]} onChange={(e) => set(k, Number(e.target.value))} className={input}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
  );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await saveSettings({ ...f, cookPhone: f.cookPhone.trim(), grocerPhone: f.grocerPhone.trim() });
        await rescheduleReminders();
        setSaved(true);
      }}
      className="space-y-4"
    >
      <section className={section}>
        <h2 className="font-semibold">Cook</h2>
        <Field label="Name"><input value={f.cookName} onChange={(e) => set("cookName", e.target.value)} className={input} /></Field>
        <Field label="WhatsApp number" hint="10-digit mobile; +91 is added automatically.">
          <input value={f.cookPhone} onChange={(e) => set("cookPhone", e.target.value)} inputMode="tel" placeholder="98xxxxxxxx" className={input} />
        </Field>
        <Field label="Message language">
          <select value={f.cookLanguage} onChange={(e) => set("cookLanguage", e.target.value as CookLanguage)} className={input}>
            <option value="hinglish">Hindi in English letters (Hinglish)</option>
            <option value="hindi">हिंदी (Devanagari)</option>
            <option value="english">English</option>
          </select>
        </Field>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Grocer</h2>
        <Field label="Shop name"><input value={f.grocerName} onChange={(e) => set("grocerName", e.target.value)} className={input} /></Field>
        <Field label="WhatsApp / phone number"><input value={f.grocerPhone} onChange={(e) => set("grocerPhone", e.target.value)} inputMode="tel" className={input} /></Field>
        <Field label="Name on the order"><input value={f.householdName} onChange={(e) => set("householdName", e.target.value)} className={input} /></Field>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Reminder times (India time)</h2>
        <label className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Reminders on</span><input type="checkbox" checked={f.remindersOn} onChange={(e) => set("remindersOn", e.target.checked)} className="h-6 w-6" /></label>
        <Field label="Every day: send tomorrow's menu">{time("dailyMenuTime")}</Field>
        <Field label="Every day: check tonight's dinner">{time("dinnerCheckTime")}</Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Plan next week on">{day("planWeekDay")}</Field><Field label="at">{time("planWeekTime")}</Field></div>
        <div className="grid grid-cols-2 gap-3"><Field label="Send grocery order on">{day("groceryDay")}</Field><Field label="at">{time("groceryTime")}</Field></div>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Planning</h2>
        <Field label="Usual number of people"><input type="number" min={1} max={12} value={f.servingsDefault} onChange={(e) => set("servingsDefault", Math.max(1, Number(e.target.value) || 2))} className={input} /></Field>
        <Field label="Don't repeat a dish within (days)"><input type="number" min={3} max={21} value={f.noRepeatDays} onChange={(e) => set("noRepeatDays", Math.max(3, Number(e.target.value) || 10))} className={input} /></Field>
        <label className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Tuesday top-up allowed</span><input type="checkbox" checked={f.topupEnabled} onChange={(e) => set("topupEnabled", e.target.checked)} className="h-6 w-6" /></label>
        <Field label="Items sold in both places (pav, sev, mushrooms…)">
          <select value={f.eitherGoesTo} onChange={(e) => set("eitherGoesTo", e.target.value as Settings["eitherGoesTo"])} className={input}>
            <option value="blinkit">Order on Blinkit</option>
            <option value="grocer">Buy at the office grocer</option>
          </select>
        </Field>
        <label className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Blinkit search links</span><input type="checkbox" checked={f.blinkitLinks} onChange={(e) => set("blinkitLinks", e.target.checked)} className="h-6 w-6" /></label>
      </section>

      <button className="h-14 w-full rounded-xl bg-brand text-lg font-semibold text-brand-ink">{saved ? "Saved ✓" : "Save settings"}</button>
    </form>
  );
}

function DataSection({ meta }: { meta: { lastBackupAt: string | null; lastBackupWhere: string | null; lastExportAt: string | null; lastImportAt: string | null; updatedAt: string | null } }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setMsg(null);
    try {
      const f = parseHouseholdFile(await file.text());
      const cmp = await compareWithLocal(f);
      const when = (iso: string) => sentLabel(iso) ?? iso;
      const question = cmp.fileIsNewer
        ? `Load this file? It replaces all data on this phone.\n\nFile last changed: ${when(cmp.fileUpdatedAt)}\nThis phone last changed: ${when(cmp.localUpdatedAt)}`
        : `This file is OLDER than the data on this phone.\n\nFile: ${when(cmp.fileUpdatedAt)}\nThis phone: ${when(cmp.localUpdatedAt)}\n\nReplace anyway?`;
      if (!confirm(question)) return;
      await importAll(f);
      await rescheduleReminders();
      setMsg("Loaded ✓");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <section className={section}>
      <h2 className="font-semibold">Your data</h2>
      <p className="text-sm text-muted">Everything is stored only on this phone. Last changed {sentLabel(meta.updatedAt) ?? "never"}.</p>
      <button disabled={busy} onClick={async () => { setBusy(true); try { await sharePlanFile(); } finally { setBusy(false); } }} className="h-12 w-full rounded-xl bg-brand font-semibold text-brand-ink">
        Share plan (file)
      </button>
      <p className="text-xs text-muted">Sends one small file (WhatsApp, Drive, email…). On another phone use Import. Last shared: {sentLabel(meta.lastExportAt) ?? "never"}.</p>
      <button onClick={() => fileRef.current?.click()} className="h-12 w-full rounded-xl border border-line font-semibold">Import plan / Restore from backup</button>
      <p className="text-xs text-muted">Pick a shared file or a backup from Documents/GharKaMenu. Newest wins: you are warned before loading an older file. Last import: {sentLabel(meta.lastImportAt) ?? "never"}.</p>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <button disabled={busy} onClick={async () => { setBusy(true); try { const r = await writeBackup(); setMsg(`Backup saved: ${r.where}`); } catch (e) { setMsg(`Backup failed: ${(e as Error).message}`); } finally { setBusy(false); } }} className="h-12 w-full rounded-xl border border-line font-semibold">
        Back up now
      </button>
      <p className="text-xs text-muted">
        Automatic backup every week{isNative() ? ` to ${meta.lastBackupWhere ?? "Documents/GharKaMenu"}` : ""}. Last backup: {sentLabel(meta.lastBackupAt) ?? "never"}. It stays on the phone even if the app is uninstalled.
      </p>
      {msg && <p className="rounded-lg bg-soft p-3 text-sm">{msg}</p>}
    </section>
  );
}
