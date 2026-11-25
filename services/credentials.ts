import { verifyPassword } from "@/services/password";
import { recordFailedSignIn, signInAllowed } from "@/services/rate-limit";
import { withDbErrorHandling } from "@/utils/db-error";
import { prisma } from "@/utils/prisma";
import { LOGIN_PASSWORD_MAX_LENGTH } from "@/utils/validations";

/**
 * The e-mail and password check behind both sign-ins: the website's Auth.js
 * Credentials provider (services/auth.ts) and POST /api/v1/auth/login. Each
 * caller only phrases the outcome (null or an error code for Auth.js, a
 * status and message for the app). Registration, the other half of the
 * credentials flow, is shared through services/account-registration.ts.
 */

export type CredentialUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  registrationNumber: string | null;
  emailVerified: Date | null;
};

export type CredentialCheck =
  | { ok: true; user: CredentialUser & { emailVerified: Date } }
  /** Unknown address, removed account, no password, or a wrong one. */
  | { ok: false; reason: "INVALID" }
  | { ok: false; reason: "RATE_LIMITED"; retryAfterSeconds: number }
  /** The password is right but the address was never confirmed. */
  | { ok: false; reason: "EMAIL_NOT_VERIFIED"; user: CredentialUser };

/** Lower-cased and trimmed, as accounts are stored. */
export function normalizeSignInEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function authenticateCredentials(rawEmail: string, password: string, ip: string): Promise<CredentialCheck> {
  const email = normalizeSignInEmail(rawEmail);
  // No password was ever allowed this long, so it cannot match.
  if (password.length > LOGIN_PASSWORD_MAX_LENGTH) return { ok: false, reason: "INVALID" };

  // Brute-force protection: failed attempts per address and network, and
  // every attempt per network; only failures count against the address, so
  // nobody can lock someone else out.
  const allowed = await signInAllowed(email, ip);
  if (!allowed.ok) return { ok: false, reason: "RATE_LIMITED", retryAfterSeconds: allowed.retryAfterSeconds };

  const user = await withDbErrorHandling(() => prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        image: true,
        registrationNumber: true,
        emailVerified: true,
        deletedAt: true,
      },
    }), "Database operation failed");

  // An unknown or password-less account costs the same bcrypt work as a
  // wrong password, so the timing does not reveal which addresses exist.
  const valid = await verifyPassword(password, user?.deletedAt ? null : user?.password);
  if (!user || !valid) {
    await recordFailedSignIn(email, ip);
    return { ok: false, reason: "INVALID" };
  }

  const account: CredentialUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    registrationNumber: user.registrationNumber,
    emailVerified: user.emailVerified,
  };
  // An unverified address cannot sign in with a password: until the owner
  // confirms the mailbox, nobody can prove the account is theirs.
  if (!account.emailVerified) return { ok: false, reason: "EMAIL_NOT_VERIFIED", user: account };
  return { ok: true, user: { ...account, emailVerified: account.emailVerified } };
}
