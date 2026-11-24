"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/utils/prisma";
import { findVerificationToken } from "@/services/tokens";
import { revokeAllApiSessions } from "@/services/api-auth";
import { forgetRecentClaims } from "@/services/auth-jwt";

/**
 * Consumes a verification token. This is a POST (server action) so link
 * prefetchers and mail scanners that merely GET /verify-email?token=… cannot
 * verify an address or burn the token.
 */
export async function confirmEmailVerification(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) redirect("/verify-email?error=invalid");

  const existingToken = await findVerificationToken(token);
  if (!existingToken) redirect("/verify-email?error=invalid");
  if (new Date() > existingToken.expires) redirect("/verify-email?error=expired");

  const user = await prisma.user.findUnique({ where: { email: existingToken.identifier } });
  if (!user) redirect("/verify-email?error=notfound");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      // No session of any kind from before verification survives.
      data: { emailVerified: new Date(), sessionVersion: { increment: 1 } },
    }),
    prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: existingToken.identifier,
          token: existingToken.token,
        },
      },
    }),
  ]);
  forgetRecentClaims(user.id);
  // The account may have been registered by someone else before the owner
  // proved the mailbox; no API session from before verification survives.
  await revokeAllApiSessions(user.id);

  redirect("/verify-email?verified=1");
}
