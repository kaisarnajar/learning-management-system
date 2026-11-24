import { NextRequest } from "next/server";
import { answerFatwaQuestion } from "@/app/admin/fatwa/actions";
import { ADMIN_ROLES, readActionForm, staffAction } from "@/services/api-staff";
import { NOT_FOUND_CODE, withErrorCodes } from "@/services/api-content";

type Params = { params: Promise<{ id: string }> };

/**
 * Publishes (or updates) the answer, approving a teacher's pending one: answer (HTML, at least 20 characters,
 * sanitised by the website), featuredOnHomepage ("on"). The asker is e-mailed the first time it goes live; the
 * `redirect` carries `email=anonymous|skipped|failed` when no e-mail went out, as the website's toast reports.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/fatwa/[id]/answer", async () => {
    const form = await readActionForm(request);
    return withErrorCodes(() => answerFatwaQuestion(id, form), NOT_FOUND_CODE("Question"));
  });
}
