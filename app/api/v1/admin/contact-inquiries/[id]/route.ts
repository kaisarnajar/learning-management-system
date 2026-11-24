import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteContactInquiryById } from "@/app/admin/contact-inquiries/actions";
import { inquiryJson } from "@/app/api/v1/admin/contact-inquiries/inquiry-json";
import { ADMIN_ROLES, staffAction, staffRead } from "@/services/api-staff";
import { getContactInquiryById } from "@/services/contact-inquiries";

type Params = { params: Promise<{ id: string }> };

/** One inquiry, as on /admin/contact-inquiries/[id]. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/contact-inquiries/[id]", async () => {
    const inquiry = await getContactInquiryById(id);
    if (!inquiry) notFound();
    return { inquiry: inquiryJson(inquiry) };
  });
}

/** Deletes the inquiry. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/contact-inquiries/[id] DELETE", () => deleteContactInquiryById(id));
}
