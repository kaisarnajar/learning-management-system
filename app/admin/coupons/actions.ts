"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { z } from "zod";

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

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    return { error: "Failed to approve request." };
  }
}

export async function rejectCouponRequest(requestId: string) {
  await requireAdmin();
  try {
    await prisma.couponRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    return { error: "Failed to reject request." };
  }
}
