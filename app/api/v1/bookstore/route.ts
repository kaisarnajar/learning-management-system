import { NextRequest, NextResponse } from "next/server";
import { getPublishedBooksPaginated } from "@/services/bookstore";
import { parseApiPagination } from "@/utils/api-pagination";
import { toPublicBookDto } from "@/services/api-dto";
import { apiServerError } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
    const search = searchParams.get("search") || undefined;

    const result = await getPublishedBooksPaginated(page, pageSize, search);

    return NextResponse.json({
      success: true,
      data: result.items.map(toPublicBookDto),
      totalCount: result.totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    return apiServerError("api/v1/bookstore", error, "Failed to fetch bookstore items.");
  }
}
