import { NextRequest, NextResponse } from "next/server";
import { getPublishedBooksPaginated } from "@/services/bookstore";
import { parseApiPagination } from "@/utils/api-pagination";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
    const search = searchParams.get("search") || undefined;

    const result = await getPublishedBooksPaginated(page, pageSize, search);

    return NextResponse.json({
      success: true,
      data: result.items,
      totalCount: result.totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[api/v1/bookstore] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookstore items." },
      { status: 500 }
    );
  }
}
