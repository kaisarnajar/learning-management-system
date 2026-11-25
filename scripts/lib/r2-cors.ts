import type { CORSConfiguration } from "@aws-sdk/client-s3";

/**
 * The CORS rule direct uploads need (services/direct-upload.ts): the site's
 * origins may PUT to the bucket that holds staging/ uploads, sending only the
 * Content-Type header the presigned URL signs. Nothing else is allowed.
 */
export function directUploadCorsConfiguration(origins: string[]): CORSConfiguration {
  return {
    CORSRules: [
      {
        ID: "direct-uploads",
        AllowedOrigins: origins,
        AllowedMethods: ["PUT"],
        AllowedHeaders: ["content-type"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3600,
      },
    ],
  };
}

/** The origin (scheme://host[:port]) of a URL, or null when it is not an http(s) URL. */
export function originOf(url: string | undefined | null): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/** Origins from `--origin=<url>` arguments, else from AUTH_URL / NEXT_PUBLIC_APP_URL; unique, in order. */
export function corsOrigins(argv: string[], env: Record<string, string | undefined>): string[] {
  const fromArgs = argv.filter((arg) => arg.startsWith("--origin=")).map((arg) => arg.slice("--origin=".length));
  const candidates = fromArgs.length > 0 ? fromArgs : [env.AUTH_URL, env.NEXT_PUBLIC_APP_URL];
  const origins = candidates.map(originOf).filter((origin): origin is string => Boolean(origin));
  return [...new Set(origins)];
}
