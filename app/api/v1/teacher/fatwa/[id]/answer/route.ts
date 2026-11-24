import { NextRequest } from "next/server";
import { submitTeacherFatwaAnswer } from "@/app/teacher/(portal)/fatwa/actions";
import { readActionForm, staffAction, TEACHER_ROLES } from "@/services/api-staff";
import { NOT_FOUND_CODE, withErrorCodes } from "@/services/api-content";

type Params = { params: Promise<{ id: string }> };

/** Saves the teacher's draft answer (HTML, at least 20 characters) and submits it for admin approval. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, TEACHER_ROLES, "api/v1/teacher/fatwa/[id]/answer", async () => {
    const form = await readActionForm(request);
    return withErrorCodes(() => submitTeacherFatwaAnswer(id, form), NOT_FOUND_CODE("Question"));
  });
}
