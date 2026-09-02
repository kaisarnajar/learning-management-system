import { NextRequest, NextResponse } from "next/server";
import { getPublishedBooksPaginated } from "@/services/bookstore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
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
