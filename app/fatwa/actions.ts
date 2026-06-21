"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  const parsed = fatwaQuestionSchema.safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    question: formData.get("question"),
    askerName: formData.get("askerName"),
    askerEmail: formData.get("askerEmail"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const askerName = session?.user?.name?.trim() || parsed.data.askerName;
  const askerEmail = session?.user?.email?.toLowerCase().trim() || parsed.data.askerEmail;

  await prisma.fatwaQuestion.create({
    data: {
      userId: session?.user?.id ?? null,
      askerName,
      askerEmail,
      category: parsed.data.category,
      title: parsed.data.title,
      question: parsed.data.question,
    },
  });

  revalidatePath("/admin/fatwa");
  return { success: "Thank you. Your question has been received. We will email you when a scholar publishes an answer." };
}
