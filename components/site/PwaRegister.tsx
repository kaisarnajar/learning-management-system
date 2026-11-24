"use client";

import { useEffect } from "react";

/** Registers the service worker served by app/sw.js/route.ts (offline fallback and PWA install). Mounted in the root layout. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => console.error("PWA Service Worker registration failed:", err));
    }
  }, []);

  return null;
}
