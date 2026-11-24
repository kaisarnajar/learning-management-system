import { NextRequest } from "next/server";
import { rejectStudentReview } from "@/app/admin/review-approvals/actions";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Rejects a pending review; the student can edit and resubmit it. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/review-approvals/[id]/reject", () => rejectStudentReview(id));
}
