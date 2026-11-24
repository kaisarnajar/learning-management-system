import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { fatwaRow } from "@/services/api-content";
import { getAllFatwaQuestionsPaginated, type FatwaAdminFilter } from "@/services/fatwa";

const FILTERS: readonly FatwaAdminFilter[] = ["unanswered", "pending", "answered", "rejected"];

/**
 * Fatwa questions, newest first, as on /admin/fatwa. `filter`: unanswered, pending (a teacher's answer awaits
 * review), answered, rejected; `q` searches subject, asker, e-mail and category.
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/fatwa", async () => {
    const { page, pageSize, q, params } = staffListParams(request);
    const raw = params.get("filter") as FatwaAdminFilter | null;
    const filter = raw && FILTERS.includes(raw) ? raw : undefined;
    const { items, totalCount } = await getAllFatwaQuestionsPaginated(page, pageSize, filter, q || undefined);
    return pagedBody(items.map((item) => fatwaRow(item, { withAsker: true })), totalCount, page, pageSize);
  });
}
