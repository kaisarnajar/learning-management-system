import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { toggleBlogLike } from "@/services/blog-engagement";
import { apiError, apiServerError } from "@/utils/api-response";

/** Likes the post, or removes the caller's like. Answers the new state. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const result = await toggleBlogLike(user.id, id);
    if (!result.ok) return apiError(result.error, result.status);
    return NextResponse.json({ success: true, liked: result.liked, likeCount: result.likeCount });
  } catch (error) {
    return apiServerError("api/v1/blog/[id]/like", error, "Failed to update the like.");
  }
}
