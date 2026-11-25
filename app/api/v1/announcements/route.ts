import { NextRequest } from "next/server";
import { getPublishedSiteAnnouncementsPaginated } from "@/services/site-announcements";
import { parseApiPagination } from "@/utils/api-pagination";
import { apiServerError, publicJson } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
    const search = searchParams.get("search") || undefined;

    const result = await getPublishedSiteAnnouncementsPaginated(page, pageSize, search);

    return publicJson(request, {
      success: true,
      data: result.items,
      totalCount: result.totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    return apiServerError("api/v1/announcements", error, "Failed to fetch announcements.");
  }
}
