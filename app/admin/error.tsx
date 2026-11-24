"use client";

import { useEffect } from "react";
import { ErrorState, errorDigest } from "@/components/site/ErrorState";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      eyebrow="Error"
      title="Something went wrong"
      message="We could not load this page. Please try again in a moment."
      homeHref="/admin"
      homeLabel="Back to the dashboard"
      onRetry={retry}
      digest={errorDigest(error)}
    />
  );
}
