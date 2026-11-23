import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { getAnnouncementAuthorName, getAnnouncementsVisibleToStudentPaginated } from "@/services/announcements";
import { parseApiPagination } from "@/utils/api-pagination";
import { apiServerError } from "@/utils/api-response";

/**
 * The caller's announcements for one course: course-wide ones and the
 * private messages their teacher sent them, each paginated on its own
 * (?page for private messages, ?coursePage for course-wide, ?pageSize for
 * both). Empty unless the enrollment is approved. Attachment paths are
 * /api/files/... and are fetched with the same Bearer token.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
    const coursePage = parseApiPagination(new URLSearchParams({ page: searchParams.get("coursePage") ?? "1" })).page;

    const result = await getAnnouncementsVisibleToStudentPaginated(user.id, id, page, coursePage, pageSize);
    const withAuthor = <T extends Parameters<typeof getAnnouncementAuthorName>[0]>(items: T[]) =>
      items.map((item) => ({ ...item, authorName: getAnnouncementAuthorName(item) }));

    return NextResponse.json({
      success: true,
      courseWide: withAuthor(result.courseWide),
      courseWideTotal: result.courseWideTotal,
      personal: withAuthor(result.personal),
      personalTotal: result.personalTotal,
      page,
      coursePage,
      pageSize,
    });
  } catch (error) {
    return apiServerError("api/v1/courses/[id]/announcements", error, "Failed to fetch announcements.");
  }
}
