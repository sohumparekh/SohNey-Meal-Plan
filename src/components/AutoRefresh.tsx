"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Keeps both phones in sync: refetch when the app comes to the front, and every minute while open. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    const t = setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      clearInterval(t);
    };
  }, [router]);
  return null;
}
