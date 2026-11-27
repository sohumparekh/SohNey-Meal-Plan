import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PageTitle } from "@/components/ui";
import { compareWithLocal, importAll, parseHouseholdFile } from "@/data/backup";
import { getMeta } from "@/data/db";
import { getPlannerData, getSettings, recentMessages, saveSettings } from "@/data/repo";
import { nowIST, prettyDate } from "@/lib/core/dates";
import { packLabel } from "@/lib/core/quantity";
import type { CookLanguage, Settings } from "@/lib/core/types";
import { isNative, sharePlanFile, writeBackup } from "@/native/device";
import { haptic } from "@/native/haptics";
import { askNotificationPermission, openExactAlarmSetting, reminderStatus, rescheduleReminders, type ReminderStatus } from "@/native/reminders";
import { Floating, Glass, Press, Segmented, Stagger, Switch, applyGlassMode, getGlassMode, rise, spring, useToast, type GlassMode } from "@/ui/glass";
import { sentLabel, useLive } from "./view";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Glass variants={rise} className="p-4">
      <div className="relative z-[2] space-y-3">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted">{title}</h2>
        {children}
      </div>
    </Glass>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[14px] font-semibold">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[15px] font-semibold">{label}</div>
        {hint && <div className="text-[12px] text-muted">{hint}</div>}
      </div>
      {children}
    </div>
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
    <Stagger className="space-y-4">
      <PageTitle sub="Ghar ka Menu" title="Settings" />
      <Reminders />
      <SettingsForm s={settings} />
      <Appearance />
      <DataSection meta={meta} />
      <Section title="Messages with the cook">
        {meta.messages.length === 0 && <p className="text-[14px] text-muted">Nothing yet.</p>}
        <ul className="space-y-2">
          {meta.messages.map((m) => (
            <li key={m.id} className="rounded-2xl bg-white/35 p-3 text-[13px] dark:bg-white/5">
              <div className="text-[11px] font-semibold text-muted">{m.direction === "out" ? "Sent" : "Reply"} · {m.kind} · {sentLabel(m.createdAt)}</div>
              <div className="line-clamp-3 whitespace-pre-wrap">{m.text}</div>
            </li>
          ))}
        </ul>
      </Section>
    </Stagger>
  );
}

function Reminders() {
  const [st, setSt] = useState<ReminderStatus | null>(null);
  useEffect(() => {
    reminderStatus().then(setSt);
    const onVis = () => document.visibilityState === "visible" && rescheduleReminders().then(setSt); // back from system settings
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  if (!st) return null;
  const fmt = (iso: string | null) => (iso ? `${prettyDate(nowIST(new Date(iso)).date)} ${nowIST(new Date(iso)).hhmm}` : "none");
  return (
    <Section title="Reminders">
      {!st.supported && <p className="text-[14px] text-muted">Reminders work in the installed Android app.</p>}
      {st.supported && st.permission !== "granted" && (
        <>
          <p className="rounded-2xl p-3 text-[14px] text-warn-ink" style={{ background: "var(--warn-bg)" }}>Notifications are off, so no reminders will show.</p>
          <Press variant="brand" className="w-full" onClick={async () => { await askNotificationPermission(); setSt(await rescheduleReminders()); }}>
            Allow notifications
          </Press>
          {st.permission === "denied" && <p className="text-[12px] text-muted">If nothing happens: phone Settings → Apps → Ghar ka Menu → Notifications → Allow.</p>}
        </>
      )}
      {st.supported && st.permission === "granted" && (
        <>
          {st.exact === "granted" ? (
            <p className="flex items-center gap-2 text-[14px] font-semibold text-ok"><span className="h-2 w-2 rounded-full bg-ok" /> Exact timing on</p>
          ) : (
            <>
              <p className="rounded-2xl p-3 text-[14px] text-warn-ink" style={{ background: "var(--warn-bg)" }}>
                Exact alarms are off, so Android may deliver reminders a few minutes late.
              </p>
              <Press variant="brand" className="w-full" onClick={() => openExactAlarmSetting()}>Allow exact reminders</Press>
            </>
          )}
          <p className="text-[13px] text-muted">{st.scheduled} reminders set · next {fmt(st.next)} · until {fmt(st.until)} (opening the app extends this)</p>
        </>
      )}
    </Section>
  );
}

function SettingsForm({ s }: { s: Settings }) {
  const [f, setF] = useState(s);
  const [dirty, setDirty] = useState(false);
  const toast = useToast();
  const ingredients = useLive(async () => (await getPlannerData()).ingredients);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => { setF((x) => ({ ...x, [k]: v })); setDirty(true); };
  const time = (k: "dailyMenuTime" | "dinnerCheckTime" | "planWeekTime" | "groceryTime") => (
    <input type="time" value={f[k]} onChange={(e) => /^\d{2}:\d{2}$/.test(e.target.value) && set(k, e.target.value)} className="field" />
  );
  const day = (k: "planWeekDay" | "groceryDay") => (
    <select value={f[k]} onChange={(e) => set(k, Number(e.target.value))} className="field">{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
  );
  async function save() {
    await saveSettings({ ...f, cookPhone: f.cookPhone.trim(), grocerPhone: f.grocerPhone.trim() });
    await rescheduleReminders();
    setDirty(false);
    haptic.success();
    toast({ text: "Settings saved" });
  }
  const extras = f.weeklyExtras ?? [];
  const setExtra = (id: string, packs: number) =>
    set("weeklyExtras", packs <= 0 ? extras.filter((e) => e.ingredientId !== id) : extras.map((e) => (e.ingredientId === id ? { ...e, packs } : e)));
  const addable = ingredients ? Object.values(ingredients).filter((i) => i.category !== "staple" && !extras.some((e) => e.ingredientId === i.id)).sort((a, b) => a.nameEn.localeCompare(b.nameEn)) : [];

  return (
    <>
      <Section title="Cook">
        <Field label="Name"><input value={f.cookName} onChange={(e) => set("cookName", e.target.value)} className="field" /></Field>
        <Field label="WhatsApp number" hint="10-digit mobile; +91 is added automatically.">
          <input value={f.cookPhone} onChange={(e) => set("cookPhone", e.target.value)} inputMode="tel" placeholder="98xxxxxxxx" className="field" />
        </Field>
        <Field label="Message language">
          <select value={f.cookLanguage} onChange={(e) => set("cookLanguage", e.target.value as CookLanguage)} className="field">
            <option value="hinglish">Hindi in English letters (Hinglish)</option>
            <option value="hindi">हिंदी (Devanagari)</option>
            <option value="english">English</option>
          </select>
        </Field>
      </Section>

      <Section title="Household">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Eats eggs"><input value={f.eggEater} onChange={(e) => set("eggEater", e.target.value)} className="field" /></Field>
          <Field label="No eggs"><input value={f.nonEggEater} onChange={(e) => set("nonEggEater", e.target.value)} className="field" /></Field>
        </div>
        <p className="text-[12px] text-muted">Egg dishes are breakfast-only and for {f.eggEater}; {f.nonEggEater} always gets an egg-free dish alongside.</p>
        <Field label="Usual number of people"><input type="number" min={1} max={12} value={f.servingsDefault} onChange={(e) => set("servingsDefault", Math.max(1, Number(e.target.value) || 2))} className="field" /></Field>
      </Section>

      <Section title="Every week, whatever the menu">
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {extras.map((e) => {
              const ing = ingredients?.[e.ingredientId];
              return (
                <motion.li key={e.ingredientId} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={spring} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{ing?.nameEn ?? e.ingredientId}</span>
                    <span className="block text-[12px] text-muted">{ing ? `${packLabel(ing, e.packs)} · ${ing.source === "grocer" ? "Shubham" : "Blinkit"}` : ""}</span>
                  </span>
                  <span className="btn-glass flex h-10 items-center rounded-2xl">
                    <button aria-label="Less" className="h-full w-10 text-lg font-semibold" onClick={() => { haptic.select(); setExtra(e.ingredientId, e.packs - 1); }}>−</button>
                    <span className="w-6 text-center text-[14px] font-bold tabular-nums">{e.packs}</span>
                    <button aria-label="More" className="h-full w-10 text-lg font-semibold" onClick={() => { haptic.select(); setExtra(e.ingredientId, e.packs + 1); }}>+</button>
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        <select
          value=""
          onChange={(e) => { if (e.target.value) set("weeklyExtras", [...extras, { ingredientId: e.target.value, packs: 1 }]); }}
          className="field"
        >
          <option value="">+ Add a weekly item…</option>
          {addable.map((i) => <option key={i.id} value={i.id}>{i.nameEn}</option>)}
        </select>
      </Section>

      <Section title="Grocer">
        <Field label="Shop name"><input value={f.grocerName} onChange={(e) => set("grocerName", e.target.value)} className="field" /></Field>
        <Field label="WhatsApp / phone number"><input value={f.grocerPhone} onChange={(e) => set("grocerPhone", e.target.value)} inputMode="tel" className="field" /></Field>
        <Field label="Name on the order"><input value={f.householdName} onChange={(e) => set("householdName", e.target.value)} className="field" /></Field>
      </Section>

      <Section title="Reminder times (India time)">
        <Row label="Reminders"><Switch on={f.remindersOn} onChange={(v) => set("remindersOn", v)} label="Reminders" /></Row>
        <Field label="Every day: send tomorrow's menu">{time("dailyMenuTime")}</Field>
        <Field label="Every day: check tonight's dinner">{time("dinnerCheckTime")}</Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Plan next week on">{day("planWeekDay")}</Field><Field label="at">{time("planWeekTime")}</Field></div>
        <div className="grid grid-cols-2 gap-3"><Field label="Grocery order on">{day("groceryDay")}</Field><Field label="at">{time("groceryTime")}</Field></div>
      </Section>

      <Section title="Planning">
        <Field label="Don't repeat a dish within (days)"><input type="number" min={3} max={21} value={f.noRepeatDays} onChange={(e) => set("noRepeatDays", Math.max(3, Number(e.target.value) || 10))} className="field" /></Field>
        <Row label="Tuesday top-up allowed"><Switch on={f.topupEnabled} onChange={(v) => set("topupEnabled", v)} label="Tuesday top-up" /></Row>
        <Field label="Items sold in both places (pav, sev…)">
          <select value={f.eitherGoesTo} onChange={(e) => set("eitherGoesTo", e.target.value as Settings["eitherGoesTo"])} className="field">
            <option value="blinkit">Order on Blinkit</option>
            <option value="grocer">Buy at the office grocer</option>
          </select>
        </Field>
        <Row label="Blinkit search links"><Switch on={f.blinkitLinks} onChange={(v) => set("blinkitLinks", v)} label="Blinkit search links" /></Row>
      </Section>

      {/* floating save bar appears only when something changed */}
      <Floating>
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={spring}
            className="fixed inset-x-0 z-40 flex justify-center px-4"
            style={{ bottom: "calc(var(--sab) + 96px)" }}
          >
            <Press variant="brand" size="lg" className="w-full max-w-[420px]" haptics="none" onClick={save}>Save settings</Press>
          </motion.div>
        )}
      </AnimatePresence>
      </Floating>
    </>
  );
}

function Appearance() {
  const [mode, setMode] = useState<GlassMode>(getGlassMode());
  return (
    <Section title="Glass effects">
      <Segmented<GlassMode>
        value={mode}
        onChange={(m) => { setMode(m); applyGlassMode(m); }}
        options={[{ value: "auto", label: "Auto" }, { value: "full", label: "Full" }, { value: "lite", label: "Lite" }]}
      />
      <p className="text-[12px] text-muted">Full: live blur and refraction. Lite: frosted look without the live blur, smoother on older phones. Auto picks Lite on low-memory phones.</p>
    </Section>
  );
}

function DataSection({ meta }: { meta: { lastBackupAt: string | null; lastBackupWhere: string | null; lastExportAt: string | null; lastImportAt: string | null; updatedAt: string | null } }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function onFile(file: File) {
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
      haptic.success();
      toast({ text: "Loaded ✓" });
    } catch (e) {
      haptic.warn();
      toast({ text: (e as Error).message });
    }
  }

  return (
    <Section title="Your data">
      <p className="text-[13px] text-muted">Everything lives only on this phone. Last changed {sentLabel(meta.updatedAt) ?? "never"}.</p>
      <Press variant="brand" className="w-full" onClick={() => sharePlanFile()}>Share plan (file)</Press>
      <p className="text-[12px] text-muted">One small file you can send over WhatsApp or Drive; Import it on another phone. Last shared: {sentLabel(meta.lastExportAt) ?? "never"}.</p>
      <Press className="w-full" onClick={() => fileRef.current?.click()}>Import plan / Restore backup</Press>
      <p className="text-[12px] text-muted">Pick a shared file or a backup from Documents/GharKaMenu. You&apos;re warned before loading an older file. Last import: {sentLabel(meta.lastImportAt) ?? "never"}.</p>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <Press
        className="w-full"
        onClick={async () => {
          try { const r = await writeBackup(); haptic.success(); toast({ text: `Backup saved: ${r.where}` }); }
          catch (e) { haptic.warn(); toast({ text: `Backup failed: ${(e as Error).message}` }); }
        }}
      >
        Back up now
      </Press>
      <p className="text-[12px] text-muted">
        Automatic backup every week{isNative() ? ` to ${meta.lastBackupWhere ?? "Documents/GharKaMenu"}` : ""}. Last: {sentLabel(meta.lastBackupAt) ?? "never"}. It stays on the phone even if the app is uninstalled.
      </p>
    </Section>
  );
}
