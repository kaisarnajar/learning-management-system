import { NextRequest } from "next/server";
import { rejectFatwaQuestion } from "@/app/admin/fatwa/actions";
import { ADMIN_ROLES, readActionForm, staffAction } from "@/services/api-staff";
import { NOT_FOUND_CODE, withErrorCodes } from "@/services/api-content";

type Params = { params: Promise<{ id: string }> };

/** Rejects a teacher's pending answer (the teacher is e-mailed). Sends the answer field as the review form does. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/fatwa/[id]/reject", async () => {
    const form = await readActionForm(request);
    return withErrorCodes(() => rejectFatwaQuestion(id, form), NOT_FOUND_CODE("Question"));
  });
}
