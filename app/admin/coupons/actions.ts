"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { z } from "zod";
import { BRAND_CONFIG } from "@/config/brand";
import { sendFeeWaiverApprovedEmail, sendFeeWaiverRejectedEmail } from "@/services/email";
import { createStudentNotification } from "@/services/notifications";
import { recordAudit } from "@/services/audit";

const createCouponSchema = z.object({
  code: z.string().trim().min(3).toUpperCase(),
  percentage: z.coerce.number().min(1).max(100),
  validFrom: z.string(),
  validUntil: z.string(),
  courseId: z.string().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  applyTo: z.enum(["BOTH", "ENROLLMENT", "COURSE"]).default("BOTH"),
});

export async function createDefaultCoupon(formData: FormData) {
  await requireAdmin();

  const parsed = createCouponSchema.safeParse({
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
    const now = new Date();
    const fromDate = new Date(validFrom);
    if (fromDate > now) {
      fromDate.setTime(now.getTime() - 60000);
    }
    
    // Set validUntil to the end of the specified day (23:59:59.999)
    const untilDate = new Date(validUntil);
    untilDate.setUTCHours(23, 59, 59, 999);

    await prisma.coupon.create({
      data: {
        code,
        type: "DEFAULT",
        percentage,
        validFrom: fromDate,
        validUntil: untilDate,
        courseId: courseId || null,
        gender: gender || null,
        isActive,
        applyToEnrollment: applyTo === "BOTH" || applyTo === "ENROLLMENT",
        applyToCourse: applyTo === "BOTH" || applyTo === "COURSE",
      },
    });

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "A coupon with this code already exists." };
    }
    return { error: "Failed to create coupon." };
  }
}

export async function updateCoupon(couponId: string, formData: FormData) {
  await requireAdmin();

  const parsed = createCouponSchema.safeParse({
    code: formData.get("code"),
    percentage: formData.get("percentage"),
    validFrom: formData.get("validFrom"),
    validUntil: formData.get("validUntil"),
    courseId: formData.get("courseId"),
    gender: formData.get("gender"),
    isActive: true,
    applyTo: formData.get("applyTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  const { code, percentage, validFrom, validUntil, courseId, gender, applyTo } = parsed.data;

  try {
    const now = new Date();
    const fromDate = new Date(validFrom);
    if (fromDate > now) {
      fromDate.setTime(now.getTime() - 60000);
    }
    const untilDate = new Date(validUntil);
    untilDate.setUTCHours(23, 59, 59, 999);

    await prisma.coupon.update({
      where: { id: couponId },
      data: {
        code,
        percentage,
        validFrom: fromDate,
        validUntil: untilDate,
        courseId: courseId || null,
        gender: gender || null,
        applyToEnrollment: applyTo === "BOTH" || applyTo === "ENROLLMENT",
        applyToCourse: applyTo === "BOTH" || applyTo === "COURSE",
      },
    });

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
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

export async function approveCouponRequest(requestId: string, percentage: number, validUntil: string) {
  await requireAdmin();

  const request = await prisma.couponRequest.findUnique({
    where: { id: requestId },
    include: { user: true, course: true },
  });

  if (!request) return { error: "Request not found" };
  if (request.status !== "PENDING") return { error: "Request already processed" };

  // Generate unique code for this student and course
  const code = `WAIVER-${request.user.name?.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const isEnrollmentOnly = request.reason.includes("[Fee Type: Enrollment Fee]");
    const isCourseOnly = request.reason.includes("[Fee Type: Course Fee]");

    const untilDate = new Date(validUntil);
    untilDate.setUTCHours(23, 59, 59, 999);

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

      await tx.couponRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          couponId: coupon.id,
        },
      });
    });

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
      await sendFeeWaiverApprovedEmail({
        to: request.user.email,
        studentName: request.user.name || "Student",
        courseTitle: request.course.title,
        couponCode: code,
        percentage,
        validUntil: formattedValidUntil,
        feeTypeLabel,
        actionUrl,
      });
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

  try {
    await prisma.couponRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });

    if (request.user.email) {
      await sendFeeWaiverRejectedEmail({
        to: request.user.email,
        studentName: request.user.name || "Student",
        courseTitle: request.course.title,
        courseUrl: `${BRAND_CONFIG.websiteUrl}/profile/courses`,
      });
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
