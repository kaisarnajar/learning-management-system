import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { replyToContactInquiry } from "@/app/admin/contact-inquiries/actions";
import { ADMIN_ROLES, readActionForm, staffAction } from "@/services/api-staff";
import { getContactInquiryById } from "@/services/contact-inquiries";

type Params = { params: Promise<{ id: string }> };

/**
 * Sends (or updates and re-sends) the reply: reply (10–10000 characters). The answer's `redirect` carries
 * `email=failed` or `email=skipped` when the e-mail to the visitor did not go out.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/contact-inquiries/[id]/reply", async () => {
    // The action reports a missing inquiry as a bare "notfound" flag; answer a proper 404 instead.
    if (!(await getContactInquiryById(id))) notFound();
    return replyToContactInquiry(id, await readActionForm(request));
  });
}
