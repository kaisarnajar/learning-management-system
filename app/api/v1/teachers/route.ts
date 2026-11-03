import { NextRequest, NextResponse } from "next/server";
import { getPublishedTeachersPaginated } from "@/services/teachers";
import { parseApiPagination } from "@/utils/api-pagination";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
    const search = searchParams.get("search") || undefined;

    const result = await getPublishedTeachersPaginated(page, pageSize, search);

    return NextResponse.json({
      success: true,
      data: result.items,
      totalCount: result.totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[api/v1/teachers] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch teachers." },
      { status: 500 }
    );
  }
}
