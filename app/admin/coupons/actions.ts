"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { z } from "zod";
import { BRAND_CONFIG } from "@/config/brand";
import { sendFeeWaiverApprovedEmail, sendFeeWaiverRejectedEmail } from "@/services/email";
import { createStudentNotification } from "@/services/notifications";

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
    const fromDate = new Date(validFrom);
    
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
    const fromDate = new Date(validFrom);
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

export async function toggleCouponActive(couponId: string, isActive: boolean) {
  await requireAdmin();
  await prisma.coupon.update({
    where: { id: couponId },
    data: { isActive },
  });
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(couponId: string) {
  await requireAdmin();
  try {
    await prisma.coupon.delete({
      where: { id: couponId },
    });
    revalidatePath("/admin/coupons");
    return { success: "Coupon deleted successfully." };
  } catch (error) {
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
