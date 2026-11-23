"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getClientIp, rateLimit, RATE_LIMIT_MESSAGE, RATE_LIMITS } from "@/services/rate-limit";
import { auth } from "@/services/auth";
import { createContactInquiry } from "@/services/contact-inquiries";
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

  const limit = await rateLimit(RATE_LIMITS.CONTACT_IP, getClientIp(await headers()));
  if (!limit.ok) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  await createContactInquiry({
    sender: session?.user?.id ? { id: session.user.id, name: session.user.name, email: session.user.email } : null,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    message: parsed.data.message,
  });

  redirect("/contact?submitted=1");
}
