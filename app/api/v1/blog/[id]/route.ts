import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/services/api-auth";
import { BLOG_COMMENTS_PAGE_SIZE, getPublishedBlogPostById } from "@/services/blogs";
import { sanitizeRichText } from "@/services/rich-text";
import { apiError, apiServerError } from "@/utils/api-response";

/**
 * One published post with its images, like and comment counts and the first
 * page of comments (newest first; more via /api/v1/blog/{id}/comments?skip=).
 * With a Bearer token, `likedByMe` says whether the caller liked it.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = request.headers.get("authorization") ? await authenticateApiRequest(request) : { user: null };
    const post = await getPublishedBlogPostById(id, user?.id);
    if (!post) return apiError("Blog post not found.", 404);

    const { likes, _count, body, ...rest } = post;
    return NextResponse.json({
      success: true,
      post: {
        ...rest,
        body: sanitizeRichText(body),
        likeCount: _count.likes,
        commentCount: _count.comments,
        likedByMe: Array.isArray(likes) && likes.length > 0,
      },
      commentsPageSize: BLOG_COMMENTS_PAGE_SIZE,
    });
  } catch (error) {
    return apiServerError("api/v1/blog/[id]", error, "Failed to fetch the blog post.");
  }
}
