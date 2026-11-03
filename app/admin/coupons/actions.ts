"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireAdmin } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { BRAND_CONFIG } from "@/config/brand";
import { sendFeeWaiverApprovedEmail, sendFeeWaiverRejectedEmail } from "@/services/email";
import { createStudentNotification } from "@/services/notifications";
import { recordAudit } from "@/services/audit";
import { resolveWaiverFeeType } from "@/services/waiver-requests";
import { genderWrite } from "@/services/status-compat";
import {
  couponRequestApprovalSchema,
  couponSchema,
  specialCouponUpdateSchema,
} from "@/utils/validations";

const COUPON_CODE_ATTEMPTS = 3;

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Letters-only prefix from the student's name, so the code is readable but never "undefined". */
function waiverCodePrefix(name: string | null | undefined) {
  const letters = (name ?? "").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  return letters || "STU";
}

class AlreadyProcessedError extends Error {}

function startOfCouponDay(value: string) {
  return new Date(value);
}

function endOfCouponDay(value: string) {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

export async function createDefaultCoupon(formData: FormData) {
  await requireAdmin();

  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
    percentage: formData.get("percentage"),
    validFrom: formData.get("validFrom"),
    validUntil: formData.get("validUntil"),
    courseId: formData.get("courseId"),
    gender: formData.get("gender"),
    isActive: formData.get("isActive") === "true",
    applyTo: formData.get("applyTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  const { code, percentage, validFrom, validUntil, courseId, gender, isActive, applyTo } = parsed.data;

  try {
    await prisma.coupon.create({
      data: {
        code,
        type: "DEFAULT",
        percentage,
        validFrom: startOfCouponDay(validFrom),
        validUntil: endOfCouponDay(validUntil),
        courseId: courseId || null,
        ...genderWrite(gender || null),
        isActive,
        applyToEnrollment: applyTo === "BOTH" || applyTo === "ENROLLMENT",
        applyToCourse: applyTo === "BOTH" || applyTo === "COURSE",
      },
    });

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "A coupon with this code already exists." };
    }
    return { error: "Failed to create coupon." };
  }
}

export async function updateCoupon(couponId: string, formData: FormData) {
  await requireAdmin();

  const existing = await prisma.coupon.findUnique({
    where: { id: couponId },
    select: { type: true },
  });
  if (!existing) return { error: "Coupon not found." };

  try {
    // SPECIAL coupons are tied to one student's waiver: only the discount,
    // validity window and active flag may change.
    if (existing.type === "SPECIAL") {
      const parsed = specialCouponUpdateSchema.safeParse({
        percentage: formData.get("percentage"),
        validFrom: formData.get("validFrom"),
        validUntil: formData.get("validUntil"),
        isActive: formData.get("isActive") === "true",
      });
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || "Invalid input." };
      }

      const { percentage, validFrom, validUntil, isActive } = parsed.data;
      await prisma.coupon.update({
        where: { id: couponId },
        data: {
          percentage,
          validFrom: startOfCouponDay(validFrom),
          validUntil: endOfCouponDay(validUntil),
          isActive,
        },
      });
    } else {
      const parsed = couponSchema.safeParse({
        code: formData.get("code"),
        percentage: formData.get("percentage"),
        validFrom: formData.get("validFrom"),
        validUntil: formData.get("validUntil"),
        courseId: formData.get("courseId"),
        gender: formData.get("gender"),
        isActive: formData.get("isActive") === "true",
        applyTo: formData.get("applyTo"),
      });
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || "Invalid input." };
      }

      const { code, percentage, validFrom, validUntil, courseId, gender, isActive, applyTo } = parsed.data;
      await prisma.coupon.update({
        where: { id: couponId },
        data: {
          code,
          percentage,
          validFrom: startOfCouponDay(validFrom),
          validUntil: endOfCouponDay(validUntil),
          courseId: courseId || null,
          ...genderWrite(gender || null),
          isActive,
          applyToEnrollment: applyTo === "BOTH" || applyTo === "ENROLLMENT",
          applyToCourse: applyTo === "BOTH" || applyTo === "COURSE",
        },
      });
    }

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "A coupon with this code already exists." };
    }
    return { error: "Failed to update coupon." };
  }
}

/**
 * A coupon that has ever been applied is part of the financial history: it is
 * deactivated (and audited) instead of deleted. Unused coupons may be deleted.
 */
export async function deleteCoupon(couponId: string) {
  const session = await requireAdmin();
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: { _count: { select: { usages: true, submissions: true, requests: true } } },
    });
    if (!coupon) return { error: "Coupon not found." };

    const hasHistory = coupon._count.usages > 0 || coupon._count.submissions > 0;

    await prisma.$transaction(async (tx) => {
      if (hasHistory) {
        await tx.coupon.update({ where: { id: couponId }, data: { isActive: false } });
        await recordAudit(tx, session, {
          action: "update",
          entity: "Coupon",
          entityId: couponId,
          reason: "Deactivated instead of deleted: coupon has been used",
          before: { code: coupon.code, isActive: coupon.isActive },
          after: { isActive: false },
        });
      } else {
        await tx.coupon.delete({ where: { id: couponId } });
        await recordAudit(tx, session, {
          action: "delete",
          entity: "Coupon",
          entityId: couponId,
          before: { code: coupon.code, percentage: coupon.percentage, type: coupon.type },
        });
      }
    });

    revalidatePath("/admin/coupons");
    return {
      success: hasHistory
        ? "This coupon has been used, so it was deactivated instead of deleted."
        : "Coupon deleted successfully.",
    };
  } catch (error) {
    console.error("Failed to delete coupon:", error);
    return { error: "Failed to delete coupon." };
  }
}

export async function approveCouponRequest(requestId: string, rawPercentage: number, rawValidUntil: string) {
  await requireAdmin();

  const parsed = couponRequestApprovalSchema.safeParse({
    percentage: rawPercentage,
    validUntil: rawValidUntil,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input." };
  }
  const { percentage, validUntil } = parsed.data;

  const request = await prisma.couponRequest.findUnique({
    where: { id: requestId },
    include: { user: true, course: true },
  });

  if (!request) return { error: "Request not found" };
  if (request.status !== "PENDING") return { error: "Request already processed" };

  try {
    const feeType = resolveWaiverFeeType(request);
    const isEnrollmentOnly = feeType === "ENROLLMENT";
    const isCourseOnly = feeType === "COURSE";

    const untilDate = endOfCouponDay(validUntil);

    // A code collision aborts the transaction, so each attempt gets a fresh
    // code and a fresh transaction.
    let code = "";
    for (let attempt = 1; ; attempt++) {
      code = `WAIVER-${waiverCodePrefix(request.user.name)}-${randomInt(1000, 10000)}`;
      try {
        await prisma.$transaction(async (tx) => {
          const coupon = await tx.coupon.create({
            data: {
              code,
              type: "SPECIAL",
              percentage,
              validFrom: new Date(),
              validUntil: untilDate,
              courseId: request.courseId,
              userId: request.userId,
              isActive: true,
              applyToEnrollment: !isCourseOnly,
              applyToCourse: !isEnrollmentOnly,
            },
          });

          // Guard against a concurrent decision on the same request.
          const claimed = await tx.couponRequest.updateMany({
            where: { id: requestId, status: "PENDING" },
            data: { status: "APPROVED", couponId: coupon.id },
          });
          if (claimed.count === 0) {
            throw new AlreadyProcessedError();
          }
        });
        break;
      } catch (error) {
        if (isUniqueViolation(error) && attempt < COUPON_CODE_ATTEMPTS) continue;
        throw error;
      }
    }

    const feeTypeLabel = isEnrollmentOnly
      ? "Enrollment Fee Only"
      : isCourseOnly
      ? "Course Fee Only"
      : "Both Enrollment & Course Fees";

    const formattedValidUntil = untilDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const targetPath = isEnrollmentOnly
      ? `/profile/courses/${request.courseId}/enrollment-pay`
      : `/profile/courses/${request.courseId}/pay`;

    const actionUrl = `${BRAND_CONFIG.websiteUrl}${targetPath}`;

    if (request.user.email) {
      const to = request.user.email;
      after(() => sendFeeWaiverApprovedEmail({
        to,
        studentName: request.user.name || "Student",
        courseTitle: request.course.title,
        couponCode: code,
        percentage,
        validUntil: formattedValidUntil,
        feeTypeLabel,
        actionUrl,
      }));
    }

    await createStudentNotification({
      userId: request.userId,
      type: "PERSONAL_MESSAGE",
      title: `Fee waiver approved (${percentage}% OFF)`,
      body: `Your fee waiver request for "${request.course.title}" was approved. Use coupon code ${code} before ${formattedValidUntil}.`,
      href: targetPath,
      sourceType: "CouponRequest",
      sourceId: request.id,
    });

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    if (error instanceof AlreadyProcessedError) {
      return { error: "Request already processed" };
    }
    console.error("Failed to approve coupon request:", error);
    return { error: "Failed to approve request." };
  }
}

export async function rejectCouponRequest(requestId: string) {
  await requireAdmin();

  const request = await prisma.couponRequest.findUnique({
    where: { id: requestId },
    include: { user: true, course: true },
  });

  if (!request) return { error: "Request not found" };
  if (request.status !== "PENDING") return { error: "Request already processed" };

  try {
    const claimed = await prisma.couponRequest.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    if (claimed.count === 0) return { error: "Request already processed" };

    if (request.user.email) {
      const to = request.user.email;
      after(() => sendFeeWaiverRejectedEmail({
        to,
        studentName: request.user.name || "Student",
        courseTitle: request.course.title,
        courseUrl: `${BRAND_CONFIG.websiteUrl}/profile/courses`,
      }));
    }

    await createStudentNotification({
      userId: request.userId,
      type: "PERSONAL_MESSAGE",
      title: `Fee waiver request update`,
      body: `Your fee waiver request for "${request.course.title}" was not approved at this time.`,
      href: `/profile/waiver-requests`,
      sourceType: "CouponRequest",
      sourceId: request.id,
    });

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    console.error("Failed to reject coupon request:", error);
    return { error: "Failed to reject request." };
  }
}

/**
 * Deletes a waiver request. If its coupon has been used (usages or fee
 * submissions exist) the request is kept: payment records and submissions are
 * financial history and are never deleted from here.
 */
export async function deleteCouponRequest(requestId: string) {
  const session = await requireAdmin();

  const request = await prisma.couponRequest.findUnique({
    where: { id: requestId },
    select: { id: true, couponId: true, userId: true, courseId: true, status: true, reason: true },
  });

  if (!request) return { error: "Request not found." };

  if (request.couponId) {
    const [usages, submissions] = await Promise.all([
      prisma.couponUsage.count({ where: { couponId: request.couponId } }),
      prisma.coursePaymentSubmission.count({ where: { couponId: request.couponId } }),
    ]);
    if (usages > 0 || submissions > 0) {
      return {
        error:
          "This request's coupon has already been used for a payment, so it cannot be deleted. Deactivate the coupon from the Coupons tab instead.",
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (request.couponId) {
        // Unused coupon: safe to remove together with the request.
        await tx.coupon.delete({ where: { id: request.couponId } });
      }

      await recordAudit(tx, session, {
        action: "delete",
        entity: "CouponRequest",
        entityId: requestId,
        before: { status: request.status, couponId: request.couponId, userId: request.userId, courseId: request.courseId },
      });

      // Delete student notifications associated with this request
      await tx.studentNotification.deleteMany({
        where: { sourceType: "CouponRequest", sourceId: requestId },
      });

      // Delete the CouponRequest record itself
      await tx.couponRequest.delete({
        where: { id: requestId },
      });
    });

    revalidatePath("/admin/coupons");
    revalidatePath("/admin/coupons/finance");
    revalidatePath("/admin/finance");
    revalidatePath("/profile/waiver-requests");

    return { success: "Waiver request deleted." };
  } catch (error) {
    console.error("Failed to delete coupon request:", error);
    return { error: "Failed to delete waiver request." };
  }
}
