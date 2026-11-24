import { NextRequest } from "next/server";
import { rejectBlogPost } from "@/app/admin/blog-approvals/actions";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Rejects a pending post; the teacher can edit and resubmit it. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/blog-approvals/[id]/reject", () => rejectBlogPost(id));
}
