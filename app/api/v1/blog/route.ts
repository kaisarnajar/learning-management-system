import { NextRequest } from "next/server";
import { getPublishedBlogPostsPaginated } from "@/services/blogs";
import { parseApiPagination } from "@/utils/api-pagination";
import { sanitizeRichText } from "@/services/rich-text";
import { apiServerError, publicJson } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
    const search = searchParams.get("search") || undefined;

    const result = await getPublishedBlogPostsPaginated(page, pageSize, search);

    return publicJson(request, {
      success: true,
      data: result.items.map((post) => ({ ...post, body: sanitizeRichText(post.body) })),
      totalCount: result.totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    return apiServerError("api/v1/blog", error, "Failed to fetch blog posts.");
  }
}
