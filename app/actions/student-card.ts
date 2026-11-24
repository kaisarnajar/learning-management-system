"use server";

import { sendStudentCardEmailAsAdmin } from "@/services/student-cards";

export async function sendStudentCardToEmailAction(
  kind: string,
  enrollmentId: string,
): Promise<{ success?: boolean; error?: string }> {
  return sendStudentCardEmailAsAdmin(kind, enrollmentId);
}
