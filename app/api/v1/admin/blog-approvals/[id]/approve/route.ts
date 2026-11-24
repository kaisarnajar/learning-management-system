import { NextRequest } from "next/server";
import { approveBlogPost } from "@/app/admin/blog-approvals/actions";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Approves a pending post and publishes it on the public blog. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/blog-approvals/[id]/approve", () => approveBlogPost(id));
}
