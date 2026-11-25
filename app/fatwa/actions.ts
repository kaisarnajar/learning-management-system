"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getClientIp, rateLimit, RATE_LIMIT_MESSAGE, RATE_LIMITS } from "@/services/rate-limit";

import { auth } from "@/services/auth";
import { createFatwaQuestion } from "@/services/fatwa";

export type SubmitFatwaState = {
  error?: string;
  success?: string;
};

export async function submitFatwaQuestion(
  _prev: SubmitFatwaState,
  formData: FormData,
): Promise<SubmitFatwaState> {
  const session = await auth();

  const limit = await rateLimit(RATE_LIMITS.FATWA_ASK_IP, getClientIp(await headers()));
  if (!limit.ok) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const isAnonymous = formData.get("isAnonymous") === "on";
  const user = session?.user;

  try {
    const created = await createFatwaQuestion(
      {
        category: formData.get("category"),
        title: formData.get("title"),
        question: formData.get("question"),
        askerName: formData.get("askerName"),
        askerEmail: formData.get("askerEmail"),
      },
      { asker: user?.id && user.email ? { id: user.id, name: user.name ?? null, email: user.email } : null, isAnonymous },
    );
    if (!created.ok) return { error: created.error };
  } catch (error) {
    console.error("[SubmitFatwa Error]", error);
    return { error: "An error occurred while submitting your question. Please try again." };
  }

  revalidatePath("/admin/fatwa");
  return { success: "Thank you. Your question has been received. We will email you when a scholar publishes an answer." };
}
