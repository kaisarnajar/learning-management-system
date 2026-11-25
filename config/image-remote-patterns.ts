import type { NextConfig } from "next";

type RemotePatterns = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>;

/**
 * `images.remotePatterns` for next.config.ts: the public R2 host and nothing
 * else. Without R2_PUBLIC_URL the list is empty (next/image then refuses every
 * remote URL) rather than trusting a placeholder host someone could register.
 */
export function imageRemotePatterns(publicUrl: string | undefined, warn: (message: string) => void = () => {}): RemotePatterns {
  if (!publicUrl) {
    warn("R2_PUBLIC_URL is not set: next/image will not load any remote image.");
    return [];
  }
  let url: URL;
  try {
    url = new URL(publicUrl);
  } catch {
    warn(`R2_PUBLIC_URL is not a valid URL (${publicUrl}): next/image will not load any remote image.`);
    return [];
  }
  return [{ protocol: url.protocol === "http:" ? "http" : "https", hostname: url.hostname }];
}
