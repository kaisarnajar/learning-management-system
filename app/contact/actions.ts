"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { normalizeContactPhone } from "@/lib/contact-inquiries";
import { prisma } from "@/lib/prisma";
import { contactInquirySchema } from "@/lib/validations";

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

  await prisma.contactInquiry.create({
    data: {
      userId: session?.user?.id ?? null,
      name,
      email,
      phone: normalizeContactPhone(parsed.data.phone ?? ""),
      message: parsed.data.message,
    },
  });

  redirect("/contact?submitted=1");
}
