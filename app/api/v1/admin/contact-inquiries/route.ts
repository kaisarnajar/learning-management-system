import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { getAllContactInquiriesPaginated } from "@/services/contact-inquiries";
import { inquiryJson } from "@/app/api/v1/admin/contact-inquiries/inquiry-json";

/** Contact messages, as on /admin/contact-inquiries. `filter`: pending | replied (default all); `q`: name, e-mail, phone, message. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/contact-inquiries", async () => {
    const { page, pageSize, q, params } = staffListParams(request);
    const raw = params.get("filter");
    const filter = raw === "pending" || raw === "replied" ? raw : undefined;
    const { items, totalCount } = await getAllContactInquiriesPaginated(page, pageSize, filter, q || undefined);
    return pagedBody(items.map(inquiryJson), totalCount, page, pageSize);
  });
}
