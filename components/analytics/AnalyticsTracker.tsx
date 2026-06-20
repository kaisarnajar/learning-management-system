"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics-client";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    
    // Construct full URL path if needed, or just pathname
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    
    // Prevent duplicate tracking across hard reloads or remounts
    try {
      const lastTrackedUrl = sessionStorage.getItem("lastTrackedUrl");
      if (lastTrackedUrl === url) return;
      sessionStorage.setItem("lastTrackedUrl", url);
    } catch (e) {
      // Ignore sessionStorage errors (e.g., in incognito or iframe)
    }

    trackEvent("PAGE_VIEW", pathname); // Just sending pathname for now to keep pages uniform
  }, [pathname, searchParams]);

  return null;
}
