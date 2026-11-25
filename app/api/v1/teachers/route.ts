import { NextRequest } from "next/server";
import { getPublishedTeachersPaginated } from "@/services/teachers";
import { parseApiPagination } from "@/utils/api-pagination";
import { toTeacherSummaryDto } from "@/services/api-dto";
import { apiServerError, publicJson } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
    const search = searchParams.get("search") || undefined;

    const result = await getPublishedTeachersPaginated(page, pageSize, search);

    return publicJson(request, {
      success: true,
      data: result.items.map(toTeacherSummaryDto),
      totalCount: result.totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    return apiServerError("api/v1/teachers", error, "Failed to fetch teachers.");
  }
}
