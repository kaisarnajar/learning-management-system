"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/auth-actions";
import { createWaiverRequest } from "@/services/waiver-requests";
import { waiverRequestSchema } from "@/utils/validations";

export async function submitWaiverRequest(formData: FormData) {
  const session = await requireUser();

  const parsed = waiverRequestSchema.safeParse({
    courseId: formData.get("courseId"),
    feeType: formData.get("feeType") || "both",
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const result = await createWaiverRequest(session.user.id, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidatePath("/profile/waiver-requests");
  return { success: true };
}
