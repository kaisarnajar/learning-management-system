import { createHash, randomBytes } from "crypto";
import { prisma } from "@/utils/prisma";
import { getAppBaseUrl } from "@/services/password-reset";

const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildVerificationUrl(token: string): string {
  const base = getAppBaseUrl().replace(/\/$/, "");
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * Creates a verification token for `email`. Only the SHA-256 hash is stored, so
 * a database leak does not expose usable links; the raw token is returned once
 * to be placed in the email.
 */
export async function generateVerificationToken(email: string) {
  const token = randomBytes(VERIFICATION_TOKEN_BYTES).toString("hex");
  const expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashVerificationToken(token),
      expires,
    },
  });

  return { identifier: email, token, expires };
}

/**
 * Looks a raw token up without consuming it. Tokens issued before hashing was
 * introduced were stored verbatim, so the raw value is accepted as a fallback
 * until they expire (24 hours).
 */
export async function findVerificationToken(token: string) {
  return prisma.verificationToken.findFirst({
    where: { token: { in: [hashVerificationToken(token), token] } },
  });
}
