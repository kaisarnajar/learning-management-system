"use client";

import { useEffect } from "react";
import { ErrorState, errorDigest } from "@/components/site/ErrorState";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      eyebrow="Error"
      title="Something went wrong"
      message="We could not load this page. Please try again in a moment."
      homeHref="/"
      homeLabel="Back to home"
      onRetry={retry}
      digest={errorDigest(error)}
    />
  );
}
