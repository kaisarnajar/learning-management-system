"use server";

import { revalidatePath } from "next/cache";
import { ensureAuth } from "@/utils/auth-utils";
import { isAdminSession } from "@/services/admin";
import { getBlogCommentsPage } from "@/services/blogs";
import { addBlogComment, deleteBlogComment, editBlogComment, toggleBlogLike } from "@/services/blog-engagement";

/** Every post page: the actions only know a post's id, and its page lives at /blog/<slug>. */
function revalidateBlogPostPages() {
  revalidatePath("/blog/[slug]", "page");
}

/** Next page of comments for the "Load more" button; no sign-in needed. */
export async function loadMoreComments(blogPostId: string, skip: number) {
  try {
    const comments = await getBlogCommentsPage(blogPostId, Number.isFinite(skip) ? Math.floor(skip) : 0);
    return { success: true, comments };
  } catch (err: unknown) {
    console.error("Failed to load comments:", err);
    return { error: "Failed to load comments" };
  }
}

export async function toggleLike(blogPostId: string) {
  const { session, error } = await ensureAuth();
  if (error || !session) return { error };

  try {
    const result = await toggleBlogLike(session.user.id, blogPostId);
    if (!result.ok) return { error: result.error };
    revalidateBlogPostPages();
    revalidatePath(`/blog`);
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to toggle like:", err);
    return { error: "Failed to update like status" };
  }
}

export async function addComment(blogPostId: string, content: string) {
  const { session, error } = await ensureAuth();
  if (error || !session) return { error };

  try {
    const result = await addBlogComment(session.user, blogPostId, content);
    if (!result.ok) return { error: result.error };
    revalidateBlogPostPages();
    return { success: true, comment: result.comment };
  } catch (err: unknown) {
    console.error("Failed to add comment:", err);
    return { error: "Failed to add comment" };
  }
}

export async function deleteComment(commentId: string) {
  const { session, error } = await ensureAuth();
  if (error || !session) return { error };

  try {
    const result = await deleteBlogComment({ id: session.user.id, isAdmin: isAdminSession(session) }, commentId);
    if (!result.ok) return { error: result.error };
    revalidateBlogPostPages();
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to delete comment:", err);
    return { error: "Failed to delete comment" };
  }
}

export async function editComment(commentId: string, content: string) {
  const { session, error } = await ensureAuth();
  if (error || !session) return { error };

  try {
    const result = await editBlogComment(session.user.id, commentId, content);
    if (!result.ok) return { error: result.error };
    revalidateBlogPostPages();
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to edit comment:", err);
    return { error: "Failed to edit comment" };
  }
}
