"use server";

import { revalidatePath } from "next/cache";
import { ensureAuth } from "@/utils/auth-utils";
import { prisma } from "@/utils/prisma";
import { isAdminSession } from "@/services/admin";
import { rateLimit, RATE_LIMIT_MESSAGE, RATE_LIMITS } from "@/services/rate-limit";
import { BLOG_PUBLIC_WHERE } from "@/services/blog-approval";
import { getBlogCommentsPage } from "@/services/blogs";

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
import { blogCommentSchema } from "@/utils/validations";

/** Only published, approved posts take likes and comments. */
async function findPublicPost(blogPostId: string) {
  return prisma.blogPost.findFirst({
    where: { id: blogPostId, ...BLOG_PUBLIC_WHERE },
    select: { id: true, createdById: true, title: true },
  });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

export async function toggleLike(blogPostId: string) {
  const { session, error } = await ensureAuth();
  if (error || !session) return { error };

  const userId = session.user.id;

  try {
    if (!(await findPublicPost(blogPostId))) {
      return { error: "Blog post not found" };
    }

    // Remove-then-create keeps a double click from creating two likes: the
    // second request finds nothing to delete and its create hits the unique
    // index, which counts as "already liked".
    const removed = await prisma.blogLike.deleteMany({ where: { userId, blogPostId } });
    if (removed.count === 0) {
      try {
        await prisma.blogLike.create({ data: { userId, blogPostId } });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }

    revalidatePath(`/blog/${blogPostId}`);
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

  const limit = await rateLimit(RATE_LIMITS.COMMENT_USER, session.user.id);
  if (!limit.ok) return { error: RATE_LIMIT_MESSAGE };

  const parsedContent = blogCommentSchema.safeParse(content);
  if (!parsedContent.success) {
    return { error: parsedContent.error.issues[0]?.message ?? "Comment content cannot be empty" };
  }
  content = parsedContent.data;

  const userId = session.user.id;

  try {
    const blogPost = await findPublicPost(blogPostId);

    if (!blogPost) {
      return { error: "Blog post not found" };
    }

    const comment = await prisma.blogComment.create({
      data: {
        userId,
        blogPostId,
        content,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    if (blogPost.createdById && blogPost.createdById !== userId) {
      const commenterName = session.user.name || session.user.email || "Someone";
      await prisma.studentNotification.create({
        data: {
          userId: blogPost.createdById,
          type: "BLOG_COMMENT_ADDED",
          title: `New comment on your blog "${blogPost.title}"`,
          body: `${commenterName} commented: "${content.trim().slice(0, 50)}${content.length > 50 ? "..." : ""}"`,
          href: `/blog/${blogPostId}#comment-${comment.id}`,
        },
      });
    }

    revalidatePath(`/blog/${blogPostId}`);
    return { success: true, comment };
  } catch (err: unknown) {
    console.error("Failed to add comment:", err);
    return { error: "Failed to add comment" };
  }
}

export async function deleteComment(commentId: string) {
  const { session, error } = await ensureAuth();
  if (error || !session) return { error };

  const userId = session.user.id;
  const isAdmin = isAdminSession(session);
  
  try {
    const comment = await prisma.blogComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) return { error: "Comment not found" };

    if (comment.userId !== userId && !isAdmin) {
      return { error: "Unauthorized" };
    }

    await prisma.blogComment.delete({
      where: { id: commentId },
    });

    revalidatePath(`/blog/${comment.blogPostId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to delete comment:", err);
    return { error: "Failed to delete comment" };
  }
}

export async function editComment(commentId: string, content: string) {
  const { session, error } = await ensureAuth();
  if (error || !session) return { error };

  const parsedContent = blogCommentSchema.safeParse(content);
  if (!parsedContent.success) {
    return { error: parsedContent.error.issues[0]?.message ?? "Comment content cannot be empty" };
  }
  content = parsedContent.data;

  const userId = session.user.id;

  try {
    const comment = await prisma.blogComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) return { error: "Comment not found" };

    if (comment.userId !== userId) {
      return { error: "Unauthorized" };
    }

    await prisma.blogComment.update({
      where: { id: commentId },
      data: { content: content.trim() },
    });

    revalidatePath(`/blog/${comment.blogPostId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to edit comment:", err);
    return { error: "Failed to edit comment" };
  }
}
