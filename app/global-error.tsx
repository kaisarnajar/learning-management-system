"use client";

import { useEffect } from "react";
import { ErrorState, errorDigest } from "@/components/site/ErrorState";
import { BRAND_CONFIG } from "@/config/brand";
import "./globals.css";

/** Replaces the root layout when the layout itself fails, so it brings its own document. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <title>{`Something went wrong | ${BRAND_CONFIG.name}`}</title>
        <main className="flex flex-1 items-center">
          <ErrorState
            eyebrow={BRAND_CONFIG.name}
            title="Something went wrong"
            message="The site could not be loaded. Please try again in a moment."
            onRetry={retry}
            digest={errorDigest(error)}
          />
        </main>
      </body>
    </html>
  );
}
