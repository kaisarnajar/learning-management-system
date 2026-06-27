"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fatwaQuestionSchema } from "@/lib/validations";

export type SubmitFatwaState = {
  error?: string;
  success?: string;
};

export async function submitFatwaQuestion(
  _prev: SubmitFatwaState,
  formData: FormData,
): Promise<SubmitFatwaState> {
  const session = await auth();

  const isAnonymous = formData.get("isAnonymous") === "on";

  const parsed = fatwaQuestionSchema.safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    question: formData.get("question"),
    askerName: isAnonymous ? "Anonymous" : formData.get("askerName"),
    askerEmail: isAnonymous ? "anonymous@darsequranacademy.org" : formData.get("askerEmail"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const askerName = isAnonymous ? "Anonymous" : (session?.user?.name?.trim() || parsed.data.askerName);
  const askerEmail = isAnonymous ? "anonymous@darsequranacademy.org" : (session?.user?.email?.toLowerCase().trim() || parsed.data.askerEmail);
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
