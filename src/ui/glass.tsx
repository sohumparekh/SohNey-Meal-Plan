// Liquid-glass building blocks. Everything here is presentation only.
import { AnimatePresence, motion, useDragControls, type HTMLMotionProps, type PanInfo } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { haptic } from "@/native/haptics";

export const spring = { type: "spring", stiffness: 520, damping: 34, mass: 0.7 } as const;
export const softSpring = { type: "spring", stiffness: 260, damping: 30 } as const;

/** Animated background + the SVG filter used for real refraction on floating glass. */
export function Backdrop() {
  return (
    <>
      <div className="mesh" aria-hidden>
        <span /><span /><span /><span /><span />
      </div>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          {/* A lens: pixels near the edges are pulled inward, like light bending at the rim of a glass bead. */}
          <filter id="liquid-lens" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage
              href={LENS_MAP}
              x="0" y="0" width="100%" height="100%"
              preserveAspectRatio="none"
              result="map"
            />
            <feDisplacementMap in="SourceGraphic" in2="map" scale="38" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </>
  );
}

const LENS_MAP =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100' viewBox='0 0 200 100' preserveAspectRatio='none'>
  <defs>
    <linearGradient id='x' x1='0' x2='1' y1='0' y2='0'>
      <stop offset='0' stop-color='rgb(255,0,0)'/><stop offset='0.22' stop-color='rgb(128,0,0)'/>
      <stop offset='0.78' stop-color='rgb(128,0,0)'/><stop offset='1' stop-color='rgb(0,0,0)'/>
    </linearGradient>
    <linearGradient id='y' x1='0' x2='0' y1='0' y2='1'>
      <stop offset='0' stop-color='rgb(0,255,0)'/><stop offset='0.3' stop-color='rgb(0,128,0)'/>
      <stop offset='0.7' stop-color='rgb(0,128,0)'/><stop offset='1' stop-color='rgb(0,0,0)'/>
    </linearGradient>
  </defs>
  <rect width='200' height='100' fill='url(#x)'/>
  <rect width='200' height='100' fill='url(#y)' style='mix-blend-mode:screen'/>
</svg>`);

// ------------------------------------------------------------------ glass quality

const GLASS_KEY = "ghar-ka-menu-glass";
export type GlassMode = "auto" | "full" | "lite";
export function getGlassMode(): GlassMode {
  try { return (localStorage.getItem(GLASS_KEY) as GlassMode) || "auto"; } catch { return "auto"; }
}
/** Lite swaps live blur for frosted colour: same look, far less GPU work. Auto picks lite on low-memory phones. */
export function applyGlassMode(mode: GlassMode = getGlassMode()) {
  try { localStorage.setItem(GLASS_KEY, mode); } catch { /* private mode */ }
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const lite = mode === "lite" || (mode === "auto" && mem !== undefined && mem <= 3);
  document.documentElement.classList.toggle("lite", lite);
  return lite;
}

/** Real refraction works in Chromium (Android WebView); elsewhere it falls back to blur. */
export const canRefract = (() => {
  if (typeof navigator === "undefined") return false;
  return /Chrome\//.test(navigator.userAgent) && typeof CSS !== "undefined" && CSS.supports("backdrop-filter", "blur(1px)");
})();

/** A glass panel with a specular highlight that follows the finger. */
export function Glass({
  children, className = "", strong, as = "div", ...rest
}: { children: ReactNode; className?: string; strong?: boolean; as?: "div" | "section" | "li" } & Omit<HTMLMotionProps<"div">, "children">) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
    el.style.setProperty("--spec", "0.9");
  };
  const leave = () => ref.current?.style.setProperty("--spec", "0.55");
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      ref={ref}
      onPointerMove={move}
      onPointerDown={move}
      onPointerLeave={leave}
      onPointerUp={leave}
      className={`${strong ? "glass-strong" : "glass"} specular rounded-[26px] ${className}`}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** A button that squishes like a soft key and taps the haptics. */
export function Press({
  children, className = "", onClick, disabled, variant = "glass", size = "md", haptics = "tap", ...rest
}: {
  children: ReactNode; className?: string; onClick?: () => void | Promise<unknown>; disabled?: boolean;
  variant?: "glass" | "brand" | "wa" | "plain"; size?: "sm" | "md" | "lg"; haptics?: keyof typeof haptic | "none";
} & Omit<HTMLMotionProps<"button">, "children" | "onClick">) {
  const [busy, setBusy] = useState(false);
  const base = { glass: "btn-glass text-ink", brand: "btn-brand", wa: "btn-wa", plain: "" }[variant];
  const h = { sm: "h-10 px-3.5 text-[13px] rounded-2xl", md: "h-12 px-4 text-[15px] rounded-[18px]", lg: "h-[60px] px-5 text-[17px] rounded-[22px]" }[size];
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.955 }}
      transition={spring}
      disabled={disabled || busy}
      onClick={async () => {
        if (haptics !== "none") haptic[haptics]();
        if (!onClick) return;
        const r = onClick();
        if (r && typeof (r as Promise<unknown>).then === "function") {
          setBusy(true);
          try { await r; } finally { setBusy(false); }
        }
      }}
      className={`relative inline-flex select-none items-center justify-center gap-2 font-semibold tracking-[-0.01em] disabled:opacity-50 ${base} ${h} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/** Segmented control with a sliding glass lens. */
export function Segmented<T extends string>({
  value, onChange, options, className = "",
}: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; badge?: ReactNode }[]; className?: string }) {
  const id = useId();
  return (
    <div className={`glass flex rounded-[20px] p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => { if (o.value !== value) { haptic.select(); onChange(o.value); } }}
          className={`relative flex h-11 flex-1 flex-col items-center justify-center rounded-2xl text-[13px] font-semibold transition-colors ${o.value === value ? "text-ink" : "text-muted"}`}
        >
          {o.value === value && (
            <motion.span
              layoutId={`seg-${id}`}
              transition={spring}
              className="glass-strong absolute inset-0 rounded-2xl"
              style={{ boxShadow: "inset 0 1px 0 var(--glass-edge), 0 6px 16px -6px rgba(80,40,10,.25)" }}
            />
          )}
          <span className="relative z-10 leading-tight">{o.label}</span>
          {o.badge !== undefined && <span className="relative z-10 text-[10px] font-medium leading-tight text-muted">{o.badge}</span>}
        </button>
      ))}
    </div>
  );
}

/** iOS-style switch with a jelly knob. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => { haptic.select(); onChange(!on); }}
      className="relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300"
      style={{ background: on ? "linear-gradient(135deg,#3ee07d,var(--ok))" : "rgba(120,110,100,.25)" }}
    >
      <motion.span
        layout
        transition={spring}
        whileTap={{ scaleX: 1.18 }}
        className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,.18)]"
        style={{ left: on ? 22 : 2 }}
      />
    </button>
  );
}

/** Round check that fills and draws its tick. */
export function Check({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <motion.button
      aria-label={label}
      aria-pressed={checked}
      whileTap={{ scale: 0.85 }}
      transition={spring}
      onClick={() => { checked ? haptic.tap() : haptic.success(); onToggle(); }}
      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{
        background: checked ? "linear-gradient(135deg,#3ee07d,var(--ok))" : "rgba(255,255,255,.35)",
        border: checked ? "none" : "1.5px solid var(--faint)",
        boxShadow: checked ? "0 6px 14px -4px rgba(23,163,74,.55), inset 0 1px 0 rgba(255,255,255,.5)" : "inset 0 1px 2px rgba(0,0,0,.08)",
        transition: "background .25s, box-shadow .25s",
      }}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="white" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={false} animate={{ pathLength: checked ? 1 : 0 }} transition={{ duration: 0.28, ease: "easeOut" }} />
      </svg>
    </motion.button>
  );
}

/**
 * Renders at the top of the page. Anything "fixed to the screen" must go through this:
 * inside an animated page, a transform would pin it to the page instead of the screen.
 */
export function Floating({ children }: { children: ReactNode }) {
  return typeof document === "undefined" ? null : createPortal(children, document.body);
}

/** Bottom sheet: springs up, follows the finger, flicks away. */
export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode }) {
  const controls = useDragControls();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <Floating>
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end" initial="hidden" animate="shown" exit="hidden">
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(20,10,5,.28)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            className="glass-strong relative mx-auto flex max-h-[88dvh] w-full max-w-xl flex-col rounded-t-[34px] pb-[calc(var(--sab)+16px)]"
            variants={{ hidden: { y: "105%" }, shown: { y: 0 } }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.9 }}
            onDragEnd={(_: unknown, i: PanInfo) => { if (i.offset.y > 120 || i.velocity.y > 600) { haptic.tap(); onClose(); } }}
          >
            <div className="cursor-grab touch-none px-5 pb-2 pt-3" onPointerDown={(e) => controls.start(e)}>
              <div className="mx-auto mb-3 h-[5px] w-11 rounded-full bg-[var(--faint)] opacity-60" />
              {title}
            </div>
            <div className="overflow-y-auto px-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </Floating>
  );
}

/** Children rise into place one after another. */
export function Stagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.045 } } }}>
      {children}
    </motion.div>
  );
}
export const rise = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: softSpring, transitionEnd: { filter: "none" } },
};

// ------------------------------------------------------------------ toasts with Undo

type Toast = { id: number; text: string; undo?: () => void | Promise<void>; tone?: "ok" | "info" };
const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((xs) => [...xs.slice(-1), { ...t, id }]);
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), t.undo ? 5000 : 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4" style={{ bottom: "calc(var(--sab) + 104px)" }}>
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.94, filter: "blur(6px)" }}
              transition={spring}
              className="glass-strong pointer-events-auto flex min-h-12 w-full max-w-md items-center gap-3 rounded-[20px] py-2 pl-4 pr-2 text-[14px] font-medium"
            >
              <span className="flex-1">{t.text}</span>
              {t.undo && (
                <button
                  onClick={async () => { haptic.tap(); await t.undo!(); setToasts((xs) => xs.filter((x) => x.id !== t.id)); }}
                  className="h-9 rounded-xl px-3 text-[14px] font-bold text-brand"
                >
                  Undo
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
