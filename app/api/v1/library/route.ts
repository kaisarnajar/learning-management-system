import { NextRequest } from "next/server";
import { getPublishedLibraryItemsPaginated } from "@/services/library";
import { parseApiPagination } from "@/utils/api-pagination";
import { apiServerError, publicJson } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
    const topic = searchParams.get("topic") || searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await getPublishedLibraryItemsPaginated(page, pageSize, topic, search);

    return publicJson(request, {
      success: true,
      data: result.items,
      totalCount: result.totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    return apiServerError("api/v1/library", error, "Failed to fetch library resources.");
  }
}
