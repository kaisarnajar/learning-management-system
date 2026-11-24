import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { blogRow } from "@/services/api-content";
import { getPendingBlogPostsForAdminPaginated } from "@/services/blog-approval";

/** Teachers' posts waiting for approval, oldest first, as on /admin/blog-approvals; `q` searches title and author. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/blog-approvals", async () => {
    const { page, pageSize, q } = staffListParams(request);
    const { items, totalCount } = await getPendingBlogPostsForAdminPaginated(page, pageSize, q || undefined);
    return pagedBody(items.map(blogRow), totalCount, page, pageSize);
  });
}
