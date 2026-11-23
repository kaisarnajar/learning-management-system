import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { deleteBlogComment, editBlogComment } from "@/services/blog-engagement";
import { apiError, apiServerError, readJson } from "@/utils/api-response";

/** Edits the caller's own comment: `{ content }`. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { commentId } = await params;
    const body = await readJson(request);
    const result = await editBlogComment(user.id, commentId, body?.content);
    if (!result.ok) return apiError(result.error, result.status);
    return NextResponse.json({ success: true, comment: result.comment });
  } catch (error) {
    return apiServerError("api/v1/blog/comments/[commentId] PATCH", error, "Failed to edit the comment.");
  }
}

/** Deletes the caller's own comment. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { commentId } = await params;
    const isAdmin = user.role === "ADMIN" || user.role === "DEVELOPER";
    const result = await deleteBlogComment({ id: user.id, isAdmin }, commentId);
    if (!result.ok) return apiError(result.error, result.status);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiServerError("api/v1/blog/comments/[commentId] DELETE", error, "Failed to delete the comment.");
  }
}
