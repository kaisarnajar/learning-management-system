"use server";

import { auth } from "@/services/auth";
import { isAdminSession } from "@/services/admin";
import { isStudentCardKind, sendStudentCardEmail } from "@/services/student-cards";

export async function sendStudentCardToEmailAction(
  kind: string,
  enrollmentId: string,
): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !isAdminSession(session)) {
    return { error: "Unauthorized. Admin access required." };
  }
  if (!isStudentCardKind(kind)) {
    return { error: "Unknown card type." };
  }

  return sendStudentCardEmail(kind, enrollmentId);
}
