import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { getBlogCommentsPage } from "@/services/blogs";
import { addBlogComment } from "@/services/blog-engagement";
import { apiError, apiServerError, readJson } from "@/utils/api-response";

/** A page of comments, newest first: ?skip=<number already loaded>. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const skip = Number.parseInt(request.nextUrl.searchParams.get("skip") ?? "0", 10);
    const comments = await getBlogCommentsPage(id, Number.isFinite(skip) ? skip : 0);
    return NextResponse.json({ success: true, data: comments });
  } catch (error) {
    return apiServerError("api/v1/blog/[id]/comments GET", error, "Failed to fetch comments.");
  }
}

/** Adds a comment `{ content }` as the signed-in user. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const body = await readJson(request);
    const result = await addBlogComment(user, id, body?.content);
    if (!result.ok) return apiError(result.error, result.status);
    return NextResponse.json({ success: true, comment: result.comment }, { status: 201 });
  } catch (error) {
    return apiServerError("api/v1/blog/[id]/comments POST", error, "Failed to add the comment.");
  }
}
