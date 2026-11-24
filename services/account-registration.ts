import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { after } from "next/server";
import { prisma } from "@/utils/prisma";
import { CURRENT_POLICIES_VERSION } from "@/config/constants";
import { sendAccountExistsEmail, sendVerificationEmail } from "@/services/email";
import { getAppBaseUrl } from "@/services/password-reset";
import { buildVerificationUrl, generateVerificationToken } from "@/services/tokens";

/** What both registration endpoints answer, whether or not the address already had an account. */
export const REGISTRATION_MESSAGE =
  "Check your email: we sent a message to that address. If this is a new account, open the link to verify it, then sign in.";

/**
 * Registers an e-mail and password account, or, when the address is taken,
 * tells its owner by e-mail. The caller answers identically either way so the
 * response does not reveal which addresses have accounts: the password is
 * hashed in both cases and the e-mail goes out after the response, so neither
 * the body nor the timing (beyond a few database writes) differs.
 *
 * Returns the new user's id, or null when no account was created; the caller
 * must not let that difference reach the response.
 */
export async function registerWithPassword(input: { name?: string | null; email: string; password: string }): Promise<string | null> {
  const { name, email, password } = input;
  const hashedPassword = await hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, deletedAt: true } });
  if (existing) {
    // A removed account is not told about anything.
    if (!existing.deletedAt) after(() => notifyExistingOwner(email));
    return null;
  }

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        policiesAcceptedAt: new Date(),
        policiesAcceptedVersion: CURRENT_POLICIES_VERSION,
      },
      select: { id: true },
    });
    userId = user.id;
  } catch (error) {
    // A concurrent registration of the same address won the insert.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
    throw error;
  }

  const { token } = await generateVerificationToken(email);
  after(() => sendVerification(email, buildVerificationUrl(token)));
  return userId;
}

async function sendVerification(email: string, verificationUrl: string): Promise<void> {
  try {
    const result = await sendVerificationEmail({ to: email, verificationUrl });
    if (!result.sent && !result.skipped) console.error("[registration] Verification e-mail failed:", result.error);
  } catch (error) {
    console.error("[registration] Verification e-mail failed:", error);
  }
}

async function notifyExistingOwner(email: string): Promise<void> {
  const base = getAppBaseUrl().replace(/\/$/, "");
  try {
    const result = await sendAccountExistsEmail({ to: email, signInUrl: `${base}/login`, resetUrl: `${base}/forgot-password` });
    if (!result.sent && !result.skipped) console.error("[registration] Account-exists e-mail failed:", result.error);
  } catch (error) {
    console.error("[registration] Account-exists e-mail failed:", error);
  }
}
