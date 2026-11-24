import { NextRequest } from "next/server";
import { approveStudentReview } from "@/app/admin/review-approvals/actions";
import { ADMIN_ROLES, readActionForm, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Approves a pending review; featureOnHomepage ("on") also puts it on the homepage when a slot is free. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/review-approvals/[id]/approve", async () => {
    const form = await readActionForm(request);
    return approveStudentReview(id, form.get("featureOnHomepage") === "on");
  });
}
