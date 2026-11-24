import type { Metadata } from "next";
import { ErrorState } from "@/components/site/ErrorState";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <ErrorState
      eyebrow="404"
      title="Page not found"
      message="The page you are looking for does not exist or has been moved."
    />
  );
}
