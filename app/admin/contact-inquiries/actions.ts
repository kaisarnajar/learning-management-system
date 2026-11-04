"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { createAdminCrudActions, parseFormWith } from "@/services/admin-crud";
import { sendContactInquiryReplyEmail } from "@/services/email";
import { prisma } from "@/utils/prisma";
import { contactInquiryReplySchema } from "@/utils/validations";

const LIST_PATH = "/admin/contact-inquiries";

const parseReplyForm = parseFormWith(
  contactInquiryReplySchema,
  (formData: FormData) => ({ reply: formData.get("reply") }),
  "Invalid reply",
);

function revalidateContactInquiryPaths(id: string | undefined) {
  revalidatePath(LIST_PATH);
  if (id) {
    revalidatePath(`${LIST_PATH}/${id}`);
    revalidatePath(`${LIST_PATH}/${id}/reply`);
  }
  revalidatePath("/admin");
}

// Replying is the module's "update"; deleting an inquiry is its "remove".
const crud = createAdminCrudActions({
  label: "contact inquiry",
  notFoundMessage: "Inquiry not found.",
  model: {
    find: (id) => prisma.contactInquiry.findUnique({ where: { id } }),
    update: (id, data) => prisma.contactInquiry.update({ where: { id }, data: data as Prisma.ContactInquiryUncheckedUpdateInput }),
    remove: (id) => prisma.contactInquiry.delete({ where: { id } }),
  },
  parse: parseReplyForm,
  paths: {
    list: LIST_PATH,
    editForm: (id) => `${LIST_PATH}/${id}/reply`,
    revalidate: revalidateContactInquiryPaths,
  },
  hooks: {
    prepareUpdate: async ({ session, existing, data }) => ({
      columns: {
        reply: data.reply,
        repliedAt: existing.repliedAt ?? new Date(),
        repliedById: session.user.id,
      },
    }),

    afterUpdate: async ({ existing, data }) => {
      const emailResult = await sendContactInquiryReplyEmail({
        to: existing.email,
        name: existing.name,
        originalMessage: existing.message,
        reply: data.reply,
      });

      const savedParams = new URLSearchParams({ saved: "1" });
      if (!emailResult.sent) {
        savedParams.set("email", emailResult.skipped ? "skipped" : "failed");
      }
      return { redirectTo: `${LIST_PATH}?${savedParams.toString()}` };
    },
  },
});

export async function replyToContactInquiry(id: string, formData: FormData) {
  return crud.update(id, formData);
}

export async function deleteContactInquiryById(id: string): Promise<{ error?: string; success?: string }> {
  const result = await crud.removeById(id);
  return result.error ? result : { success: "Contact inquiry successfully deleted." };
}

export async function deleteContactInquiryForm(id: string) {
  const result = await deleteContactInquiryById(id);
  if (result.error) {
    redirect(`${LIST_PATH}/${id}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`${LIST_PATH}?deleted=1`);
}
