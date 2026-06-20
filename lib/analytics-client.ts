import type { AnalyticsEventType } from "@prisma/client";

export function trackEvent(type: AnalyticsEventType | "PAGE_VIEW" | "BUTTON_CLICK" | "CUSTOM", page: string, eventName?: string) {
  try {
    // Fire and forget without keepalive as it can cause issues in dev server
    // or with certain ad blockers. 
    fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, page, eventName: eventName || "" }),
      keepalive: true,
    }).catch((e) => console.error("Analytics fetch error:", e));
  } catch (error) {
    console.error("Failed to track event:", error);
  }
}

export function trackButtonClick(eventName: string, page: string) {
  trackEvent("BUTTON_CLICK", page, eventName);
}
