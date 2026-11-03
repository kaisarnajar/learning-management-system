import { NextRequest, NextResponse } from "next/server";
import { getPublicCoursesPaginated } from "@/services/courses";
import { parseApiPagination } from "@/utils/api-pagination";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;

    const result = await getPublicCoursesPaginated(page, pageSize, search, category);

    return NextResponse.json({
      success: true,
      data: result.items,
      totalCount: result.totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[api/v1/courses] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch courses." },
      { status: 500 }
    );
  }
}
