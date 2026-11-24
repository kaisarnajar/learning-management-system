import { NextRequest } from "next/server";
import { pagedBody, staffListParams, staffRead, TEACHER_ROLES } from "@/services/api-staff";
import { fatwaRow } from "@/services/api-content";
import { getTeacherFatwaQuestionsPaginated, type FatwaAdminFilter } from "@/services/fatwa";

const FILTERS: readonly FatwaAdminFilter[] = ["unanswered", "pending", "answered", "rejected"];

/**
 * Questions the teacher may answer (unanswered ones and those they answered), as on /teacher/fatwa.
 * `filter`: unanswered, pending, answered, rejected; `q` searches subject, question and category. No asker details.
 */
export async function GET(request: NextRequest) {
  return staffRead(request, TEACHER_ROLES, "api/v1/teacher/fatwa", async ({ user }) => {
    const { page, pageSize, q, params } = staffListParams(request);
    const raw = params.get("filter") as FatwaAdminFilter | null;
    const filter = raw && FILTERS.includes(raw) ? raw : undefined;
    const { items, totalCount } = await getTeacherFatwaQuestionsPaginated(user.id, page, pageSize, filter, q || undefined);
    return pagedBody(items.map((item) => fatwaRow(item, { withAsker: false })), totalCount, page, pageSize);
  });
}
