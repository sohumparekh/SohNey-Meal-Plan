"use client";
import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Notifications need: the app added to the Home Screen (iPhone: iOS 16.4+) and a tap here. */
export function PushSetup({ vapidKey }: { vapidKey: string }) {
  const [state, setState] = useState<"checking" | "unsupported" | "needs-install" | "off" | "on" | "denied" | "error">("checking");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        const standalone = window.matchMedia("(display-mode: standalone)").matches;
        setState(/iPhone|iPad/.test(navigator.userAgent) && !standalone ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      setState((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setState("error"));
  }, []);

  async function enable() {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
      const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
      setState(r.ok ? "on" : "error");
    } catch {
      setState("error");
    }
  }

  async function test() {
    await fetch("/api/push/test", { method: "POST" });
  }

  const text: Record<typeof state, string> = {
    checking: "Checking…",
    unsupported: "This browser can't show notifications.",
    "needs-install": "On iPhone, first tap Share → Add to Home Screen, then open the app from the Home Screen and come back here.",
    off: "Get reminders on this phone (new menu ready, send to cook, top-up).",
    on: "Notifications are on for this phone ✓",
    denied: "Notifications are blocked. Allow them for this app in the phone's Settings.",
    error: "Couldn't turn on notifications. Try again.",
  };
  return (
    <section className="space-y-2 rounded-2xl border border-line bg-card p-4">
      <h2 className="font-semibold">Notifications</h2>
      <p className="text-sm text-muted">{text[state]}</p>
      {!vapidKey && <p className="text-xs text-warn-ink">Push keys are not configured on the server yet.</p>}
      {(state === "off" || state === "error") && vapidKey && (
        <button onClick={enable} className="h-12 w-full rounded-xl bg-brand font-semibold text-brand-ink">Turn on notifications</button>
      )}
      {state === "on" && <button onClick={test} className="h-10 w-full rounded-xl border border-line text-sm">Send a test notification</button>}
    </section>
  );
}
