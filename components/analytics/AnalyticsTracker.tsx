"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics-client";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef<string>("");

  useEffect(() => {
    if (!pathname) return;
    
    // Construct full URL path if needed, or just pathname
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    
    // Prevent duplicate tracking in React Strict Mode
    if (lastTrackedUrl.current === url) return;
    lastTrackedUrl.current = url;

    trackEvent("PAGE_VIEW", pathname); // Just sending pathname for now to keep pages uniform
  }, [pathname, searchParams]);

  return null;
}
