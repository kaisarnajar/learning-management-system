import { NextRequest, NextResponse } from "next/server";
import { getPublishedLibraryItemsPaginated } from "@/services/library";
import { parseApiPagination } from "@/utils/api-pagination";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
    const topic = searchParams.get("topic") || searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await getPublishedLibraryItemsPaginated(page, pageSize, topic, search);

    return NextResponse.json({
      success: true,
      data: result.items,
      totalCount: result.totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[api/v1/library] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch library resources." },
      { status: 500 }
    );
  }
}
