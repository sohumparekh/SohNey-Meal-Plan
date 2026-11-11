import { useEffect, useState } from "react";
import { HashRouter, Route, Routes, useNavigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { BottomNav } from "./components/BottomNav";
import { seedIfNeeded } from "./data/db";
import { ensureCurrentWeeks } from "./data/repo";
import { autoBackupIfDue, isNative } from "./native/device";
import { onReminderTap, rescheduleReminders } from "./native/reminders";
import { AddDishScreen } from "./screens/AddDish";
import { CounterScreen } from "./screens/Counter";
import { DishScreen } from "./screens/Dish";
import { DishesScreen } from "./screens/Dishes";
import { SendScreen } from "./screens/Send";
import { SettingsScreen } from "./screens/Settings";
import { ShoppingScreen } from "./screens/Shopping";
import { TodayScreen } from "./screens/Today";
import { WeekScreen } from "./screens/Week";

/** Runs on start and whenever the app comes back to the front. */
async function housekeeping() {
  await ensureCurrentWeeks();
  await rescheduleReminders().catch((e) => console.warn("reminders", e));
  await autoBackupIfDue().catch((e) => console.warn("backup", e));
}

function Lifecycle() {
  const navigate = useNavigate();
  useEffect(() => {
    onReminderTap((route) => navigate(route));
    const run = () => housekeeping().catch((e) => console.error(e));
    if (isNative()) {
      const h = CapApp.addListener("resume", run);
      return () => { h.then((x) => x.remove()); };
    }
    const vis = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [navigate]);
  return null;
}

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      await navigator.storage?.persist?.().catch(() => false);
      await seedIfNeeded();
      await ensureCurrentWeeks();
      setReady(true);
      housekeeping().catch((e) => console.error(e));
    })().catch((e) => setError(String(e?.message ?? e)));
  }, []);

  if (error) return <div className="p-6 text-warn-ink">Could not start: {error}</div>;
  if (!ready) return <div className="flex min-h-dvh items-center justify-center text-5xl">🍛</div>;
  return (
    <HashRouter>
      <Lifecycle />
      <main className="mx-auto max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <Routes>
          <Route path="/" element={<TodayScreen />} />
          <Route path="/week" element={<WeekScreen />} />
          <Route path="/shopping" element={<ShoppingScreen />} />
          <Route path="/counter" element={<CounterScreen />} />
          <Route path="/send/:kind" element={<SendScreen />} />
          <Route path="/dishes" element={<DishesScreen />} />
          <Route path="/dishes/new" element={<AddDishScreen />} />
          <Route path="/dishes/:id" element={<DishScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </main>
      <BottomNav />
    </HashRouter>
  );
}
