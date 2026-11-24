import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { staffRead, TEACHER_ROLES } from "@/services/api-staff";
import { fatwaDetail } from "@/services/api-content";
import { getFatwaQuestionById, isFatwaAnswerLocked } from "@/services/fatwa";

type Params = { params: Promise<{ id: string }> };

/**
 * A question as /teacher/fatwa/[id] shows it: unanswered, or answered by this teacher (404 otherwise).
 * `canEdit` is false while the answer awaits review and once it is approved.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, TEACHER_ROLES, "api/v1/teacher/fatwa/[id]", async ({ user }) => {
    const question = await getFatwaQuestionById(id);
    if (!question || (question.answer && question.answeredById !== user.id)) notFound();
    return { question: { ...fatwaDetail(question, { withAsker: false }), canEdit: !isFatwaAnswerLocked(question) } };
  });
}
