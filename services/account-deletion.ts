import { compare } from "bcryptjs";
import type { Session } from "next-auth";
import { prisma } from "@/utils/prisma";
import { recordAudit } from "@/services/audit";
import { revalidatePublicContent } from "@/services/public-cache";
import { deleteOwnedProfileImage } from "@/services/uploads";
import { resolveUserRole } from "@/services/teacher-auth";

import { enrollmentStatusData } from "@/services/status-compat";

/**
 * A student deleting their own account (required by Google Play for apps that
 * let people sign up).
 *
 * Financial and academic records are kept, because the academy must keep
 * receipts and fee history; they stay attached to the anonymised account.
 * Everything that identifies or reaches the person is removed: name, e-mail
 * (replaced so the address can register again), password, photo, father's
 * name, date of birth, address, WhatsApp, sign-in links, sessions, API tokens,
 * devices and the cart. Requests still waiting for the academy are withdrawn.
 */

export const ACCOUNT_DELETION_CONFIRMATION = "DELETE";

export type AccountDeletionResult =
  | { ok: true }
  | { ok: false; error: string; status: 400 | 403 | 404 | 409 };

export async function deleteOwnAccount(
  userId: string,
  confirmation: { password?: unknown; confirm?: unknown },
): Promise<AccountDeletionResult> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, email: true, name: true, password: true, image: true, registrationNumber: true },
  });
  if (!user) return { ok: false, error: "Account not found.", status: 404 };

  // Staff accounts are managed by the academy, not deleted from the app.
  if ((await resolveUserRole(user.email)) !== "USER") {
    return { ok: false, error: "Staff accounts cannot be deleted from the app. Please contact the academy.", status: 403 };
  }

  // Password accounts confirm with the password; Google-only accounts type DELETE.
  if (user.password) {
    const valid = typeof confirmation.password === "string" && (await compare(confirmation.password, user.password));
    if (!valid) return { ok: false, error: "The password is not correct.", status: 403 };
  } else if (confirmation.confirm !== ACCOUNT_DELETION_CONFIRMATION) {
    return { ok: false, error: `Type ${ACCOUNT_DELETION_CONFIRMATION} to confirm.`, status: 400 };
  }

  // Money in flight must be settled first, so nobody pays for something the
  // academy can no longer attach to a person.
  const [pendingPayments, openOrders] = await Promise.all([
    prisma.coursePaymentSubmission.count({
      where: { userId, deletedAt: null, statusEnum: "PENDING_VERIFICATION" },
    }),
    prisma.bookOrder.count({
      where: { userId, deletedAt: null, status: { in: ["PENDING_VERIFICATION", "APPROVED"] } },
    }),
  ]);
  if (pendingPayments > 0) {
    return { ok: false, error: "A fee payment is still awaiting verification. Please wait until the academy has confirmed or declined it.", status: 409 };
  }
  if (openOrders > 0) {
    return { ok: false, error: "A book order is still being processed. Please wait until it has shipped or been declined.", status: 409 };
  }

  const anonymisedEmail = `deleted+${user.id}@invalid.local`;
  const now = new Date();
  const actor = { user: { id: user.id, email: user.email }, expires: now.toISOString() } as Session;

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.deviceToken.deleteMany({ where: { userId } });
    await tx.userCartItem.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { email: user.email } });
    await tx.verificationToken.deleteMany({ where: { identifier: user.email } });
    await tx.apiRefreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });

    // Applications the academy has not decided on yet are withdrawn.
    await tx.enrollment.updateMany({
      where: { userId, statusEnum: { in: ["PENDING_APPROVAL", "AWAITING_ENROLLMENT_FEE"] } },
      data: { ...enrollmentStatusData("REJECTED"), rejectedAt: now },
    });
    await tx.couponRequest.updateMany({ where: { userId, status: "PENDING" }, data: { status: "REJECTED" } });

    await tx.user.update({
      where: { id: userId },
      data: {
        deletedAt: now,
        email: anonymisedEmail,
        name: "Deleted user",
        password: null,
        image: null,
        fatherName: null,
        dateOfBirth: null,
        address: null,
        whatsapp: null,
        emailVerified: null,
        announcementEmailsOptOut: true,
      },
    });

    await recordAudit(tx, actor, {
      action: "soft_delete",
      entity: "User",
      entityId: userId,
      reason: "Deleted by the account holder",
      // The address is kept in the audit trail only, so the academy can answer
      // a question about an old receipt; it is no longer usable to sign in.
      before: { email: user.email, registrationNumber: user.registrationNumber },
      after: { email: anonymisedEmail, deletedAt: now.toISOString() },
    });
  });

  // Their featured review (and name on it) leaves the cached homepage now.
  revalidatePublicContent();

  if (user.image && !user.image.startsWith("/assets/")) {
    await deleteOwnedProfileImage(userId, user.image);
  }

  return { ok: true };
}
