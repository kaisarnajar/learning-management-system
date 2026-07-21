"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";

export async function submitWaiverRequest(formData: FormData) {
  const session = await requireAuth();

  const courseId = formData.get("courseId") as string;
  const reason = formData.get("reason") as string;

  if (!courseId || !reason || reason.length < 10) {
    return { error: "Please select a course and provide a reason (at least 10 characters)." };
  }

  // Check if there is already a pending request for this course
  const existing = await prisma.couponRequest.findFirst({
    where: {
      userId: session.user.id,
      courseId,
      status: "PENDING",
    },
  });

  if (existing) {
    return { error: "You already have a pending waiver request for this course." };
  }

  await prisma.couponRequest.create({
    data: {
      userId: session.user.id,
      courseId,
      reason,
      status: "PENDING",
    },
  });

  revalidatePath("/profile/waiver-requests");
  return { success: true };
}
