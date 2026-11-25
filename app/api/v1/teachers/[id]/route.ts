import { NextRequest } from "next/server";
import { getPublishedTeacherById } from "@/services/teachers";
import { getPublicCoursesByTeacherIdPaginated } from "@/services/courses";
import { toPublicCourseDto, toTeacherSummaryDto } from "@/services/api-dto";
import { parseApiPagination } from "@/utils/api-pagination";
import { apiError, apiServerError, publicJson } from "@/utils/api-response";

/** One published teacher with their public courses (paginated with ?page&pageSize). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const teacher = await getPublishedTeacherById(id);
    if (!teacher) return apiError("Teacher not found.", 404);

    const { page, pageSize } = parseApiPagination(request.nextUrl.searchParams);
    const courses = await getPublicCoursesByTeacherIdPaginated(teacher.id, page, pageSize);
    return publicJson(request, {
      success: true,
      teacher: toTeacherSummaryDto(teacher),
      courses: courses.items.map(toPublicCourseDto),
      totalCount: courses.totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    return apiServerError("api/v1/teachers/[id]", error, "Failed to fetch the teacher.");
  }
}
