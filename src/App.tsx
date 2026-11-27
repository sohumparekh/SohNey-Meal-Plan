import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HashRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { BottomNav, tabIndex } from "./components/BottomNav";
import { Backdrop, ToastHost } from "./ui/glass";
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
  if (!ready)
    return (
      <>
        <Backdrop />
        <div className="flex min-h-dvh items-center justify-center">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="text-6xl">🍛</motion.div>
        </div>
      </>
    );
  return (
    <HashRouter>
      <Backdrop />
      <ToastHost>
        <Lifecycle />
        <AnimatedRoutes />
        <BottomNav />
      </ToastHost>
    </HashRouter>
  );
}

/** Pages slide in from the side of the tab you came from, with a soft blur. */
function AnimatedRoutes() {
  const location = useLocation();
  const idx = tabIndex(location.pathname);
  const prev = useRef(idx);
  const dir = idx === prev.current ? 0 : idx > prev.current ? 1 : -1;
  useEffect(() => { prev.current = idx; }, [idx]);
  const key = location.pathname.split("/").slice(0, 3).join("/");
  return (
    <AnimatePresence mode="popLayout" initial={false} custom={dir}>
      <motion.main
        key={key}
        custom={dir}
        variants={{
          enter: (d: number) => ({ opacity: 0, x: d * 36, y: d === 0 ? 10 : 0, filter: "blur(8px)" }),
          // filter must end as "none": a leftover filter stops the glass inside from seeing the background
          center: { opacity: 1, x: 0, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } },
          exit: (d: number) => ({ opacity: 0, x: d * -24, filter: "blur(6px)" }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.8 }}
        className="pt-safe pb-nav mx-auto max-w-xl px-4"
      >
        <Routes location={location}>
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
      </motion.main>
    </AnimatePresence>
  );
}
