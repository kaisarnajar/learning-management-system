import { NextRequest } from "next/server";
import { getPublicCoursesPaginated } from "@/services/courses";
import { parseApiPagination } from "@/utils/api-pagination";
import { toPublicCourseDto } from "@/services/api-dto";
import { apiServerError, publicJson } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;

    const result = await getPublicCoursesPaginated(page, pageSize, search, category);

    return publicJson(request, {
      success: true,
      data: result.items.map(toPublicCourseDto),
      totalCount: result.totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    return apiServerError("api/v1/courses", error, "Failed to fetch courses.");
  }
}
