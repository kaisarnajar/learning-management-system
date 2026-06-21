"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { sendContactInquiryReplyEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { contactInquiryReplySchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

export async function replyToContactInquiry(id: string, formData: FormData) {
  const session = await requireAdmin();

  const parsed = contactInquiryReplySchema.safeParse({
    reply: formData.get("reply"),
  });

  if (!parsed.success) {
    redirect(
      `/admin/contact-inquiries/${id}/reply?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid reply")}`,
    );
  }

  const inquiry = await withDbErrorHandling(() => prisma.contactInquiry.findUnique({ where: { id } }), "Database operation failed");
  if (!inquiry) {
    redirect("/admin/contact-inquiries?error=notfound");
  }

  const now = new Date();

  await withDbErrorHandling(() => prisma.contactInquiry.update({
      where: { id },
      data: {
        reply: parsed.data.reply,
        repliedAt: inquiry.repliedAt ?? now,
        repliedById: session.user.id,
      },
    }), "Database operation failed");

  const emailResult = await sendContactInquiryReplyEmail({
    to: inquiry.email,
    name: inquiry.name,
    originalMessage: inquiry.message,
    reply: parsed.data.reply,
  });

  revalidatePath("/admin/contact-inquiries");
  revalidatePath(`/admin/contact-inquiries/${id}`);
  revalidatePath(`/admin/contact-inquiries/${id}/reply`);
  revalidatePath("/admin");

  const savedParams = new URLSearchParams({ saved: "1" });
  if (!emailResult.sent) {
    savedParams.set("email", emailResult.skipped ? "skipped" : "failed");
  }

  redirect(`/admin/contact-inquiries?${savedParams.toString()}`);
}

export async function deleteContactInquiryById(id: string): Promise<{ error?: string; success?: string }> {
  await requireAdmin();

  const inquiry = await withDbErrorHandling(() => prisma.contactInquiry.findUnique({ where: { id } }), "Database operation failed");
  if (!inquiry) {
    return { error: "Inquiry not found." };
  }

  await withDbErrorHandling(() => prisma.contactInquiry.delete({ where: { id } }), "Database operation failed");

  revalidatePath("/admin/contact-inquiries");
  revalidatePath(`/admin/contact-inquiries/${id}`);
  revalidatePath(`/admin/contact-inquiries/${id}/reply`);
  revalidatePath("/admin");

  return { success: "Contact inquiry successfully deleted." };
}

export async function deleteContactInquiryForm(id: string) {
  const result = await deleteContactInquiryById(id);
  if (result.error) {
    redirect(`/admin/contact-inquiries/${id}?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/admin/contact-inquiries?deleted=1");
}
