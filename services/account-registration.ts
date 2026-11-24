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

/** The new account's public fields, as a session response shows them. */
export type RegisteredUser = { id: string; email: string; name: string | null; image: string | null; registrationNumber: string | null };

/** `created: false` means the address already had an account (live or removed) and nothing was written. */
export type RegistrationResult = { created: true; user: RegisteredUser } | { created: false };

/**
 * Registers an e-mail and password account, or, when the address is taken,
 * tells its owner by e-mail. The password is hashed in both cases and the
 * e-mail goes out after the response, so a caller that answers identically
 * either way (the website) reveals nothing through the body or the timing
 * (beyond a few database writes).
 *
 * The mobile API does tell the two apart (a new account gets a session, a
 * taken address an error) to keep installed apps working; that endpoint is
 * rate-limited per network.
 */
export async function registerWithPassword(input: { name?: string | null; email: string; password: string }): Promise<RegistrationResult> {
  const { name, email, password } = input;
  const hashedPassword = await hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, deletedAt: true } });
  if (existing) {
    // A removed account is not told about anything.
    if (!existing.deletedAt) after(() => notifyExistingOwner(email));
    return { created: false };
  }

  let user: RegisteredUser;
  try {
    user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        policiesAcceptedAt: new Date(),
        policiesAcceptedVersion: CURRENT_POLICIES_VERSION,
      },
      select: { id: true, email: true, name: true, image: true, registrationNumber: true },
    });
  } catch (error) {
    // A concurrent registration of the same address won the insert.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { created: false };
    throw error;
  }

  const { token } = await generateVerificationToken(email);
  after(() => sendVerification(email, buildVerificationUrl(token)));
  return { created: true, user };
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
