import { createHash, randomBytes } from "crypto";
import { prisma } from "@/utils/prisma";
import { normalizeAccountEmail } from "@/services/user-account-lookup";
import { withDbErrorHandling } from "@/utils/db-error";

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function getAppBaseUrl(): string {
  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl) return authUrl;

  const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  if (prodUrl) return `https://${prodUrl}`;

  const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createResetTokenValue(): string {
  return randomBytes(RESET_TOKEN_BYTES).toString("hex");
}

export function buildPasswordResetUrl(token: string): string {
  const base = getAppBaseUrl().replace(/\/$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const normalized = normalizeAccountEmail(email);
  const user = await withDbErrorHandling(() => prisma.user.findUnique({ where: { email: normalized } }), "Database operation failed");

  if (!user) {
    return null;
  }

  const token = createResetTokenValue();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await withDbErrorHandling(() => prisma.passwordResetToken.deleteMany({ where: { email: normalized } }), "Database operation failed");
  await withDbErrorHandling(() => prisma.passwordResetToken.create({
      data: { email: normalized, tokenHash, expiresAt },
    }), "Database operation failed");

  return token;
}

export async function consumePasswordResetToken(
  token: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false, error: "Reset link is invalid or has expired." };
  }

  const tokenHash = hashResetToken(trimmed);
  const record = await withDbErrorHandling(() => prisma.passwordResetToken.findUnique({ where: { tokenHash } }), "Database operation failed");

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await withDbErrorHandling(() => prisma.passwordResetToken.delete({ where: { id: record.id } }), "Database operation failed");
    }
    return { ok: false, error: "Reset link is invalid or has expired." };
  }

  await withDbErrorHandling(() => prisma.passwordResetToken.deleteMany({ where: { email: record.email } }), "Database operation failed");

  return { ok: true, email: record.email };
}
