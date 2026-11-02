/**
 * Single source of truth for the JWT/session secret.
 *
 * In production the application refuses to start without AUTH_SECRET
 * (NEXTAUTH_SECRET is accepted as a legacy alias). There is deliberately no
 * hardcoded fallback: a known default secret would let anyone forge sessions
 * and API tokens.
 */
const DEV_FALLBACK_SECRET = "insecure-development-only-secret";

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to the environment.",
    );
  }

  console.warn("[auth] AUTH_SECRET is not set; using an insecure development-only secret.");
  return DEV_FALLBACK_SECRET;
}
