"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getClientIp, rateLimit, RATE_LIMIT_MESSAGE, RATE_LIMITS } from "@/services/rate-limit";

import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { fatwaQuestionSchema } from "@/utils/validations";
import { BRAND_CONFIG } from "@/config/brand";

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

  const parsed = fatwaQuestionSchema.safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    question: formData.get("question"),
    askerName: isAnonymous ? "Anonymous" : formData.get("askerName"),
    askerEmail: isAnonymous ? `anonymous@${new URL(BRAND_CONFIG.websiteUrl).hostname}` : formData.get("askerEmail"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const askerName = isAnonymous ? "Anonymous" : (session?.user?.name?.trim() || parsed.data.askerName);
  const askerEmail = isAnonymous ? `anonymous@${new URL(BRAND_CONFIG.websiteUrl).hostname}` : (session?.user?.email?.toLowerCase().trim() || parsed.data.askerEmail);
  const userId = isAnonymous ? null : (session?.user?.id ?? null);

  try {
    await prisma.fatwaQuestion.create({
      data: {
        userId,
        askerName,
        askerEmail,
        category: parsed.data.category,
        title: parsed.data.title,
        question: parsed.data.question,
      },
    });
  } catch (error) {
    console.error("[SubmitFatwa Error]", error);
    return { error: "An error occurred while submitting your question. Please try again." };
  }

  revalidatePath("/admin/fatwa");
  return { success: "Thank you. Your question has been received. We will email you when a scholar publishes an answer." };
}
