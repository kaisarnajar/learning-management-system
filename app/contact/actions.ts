"use server";

import { redirect } from "next/navigation";
import { auth } from "@/services/auth";
import { normalizeContactPhone } from "@/services/contact-inquiries";
import { prisma } from "@/utils/prisma";
import { contactInquirySchema } from "@/utils/validations";

export type SubmitContactInquiryState = {
  error?: string;
};

export async function submitContactInquiry(
  _prev: SubmitContactInquiryState,
  formData: FormData,
): Promise<SubmitContactInquiryState> {
  const session = await auth();

  const parsed = contactInquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const name = session?.user?.name?.trim() || parsed.data.name;
  const email = session?.user?.email?.toLowerCase().trim() || parsed.data.email;

  // Verify the session user actually exists in the DB before linking via FK.
  // A stale session cookie can reference a userId that no longer exists,
  // which would cause a P2003 foreign key constraint violation.
  let userId: string | null = null;
  if (session?.user?.id) {
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    userId = userExists?.id ?? null;
  }

  await prisma.contactInquiry.create({
    data: {
      userId,
      name,
      email,
      phone: normalizeContactPhone(parsed.data.phone ?? ""),
      message: parsed.data.message,
    },
  });

  redirect("/contact?submitted=1");
}
