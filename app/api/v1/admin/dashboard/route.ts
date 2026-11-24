import { NextRequest } from "next/server";
import { getAdminDashboardCounts } from "@/services/admin-dashboard";
import { ADMIN_NAV_GROUPS } from "@/services/admin-nav";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";

/**
 * The admin dashboard: the website's sidebar groups with each page's count.
 * `href` is the website path; the app maps it to its own screen. `count` is
 * null for tool pages (finance, settings) that have no number.
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/dashboard", async () => {
    const counts = await getAdminDashboardCounts();
    const groups = ADMIN_NAV_GROUPS.map((group) => ({
      title: group.title,
      links: group.links.map((link) => {
        const meta = counts.get(link.href);
        return { href: link.href, label: link.label, count: meta?.count ?? null, highlight: meta?.highlight ?? false };
      }),
    }));
    const actionRequired = groups.flatMap((g) => g.links).filter((l) => l.highlight);
    return { groups, actionRequired };
  });
}
