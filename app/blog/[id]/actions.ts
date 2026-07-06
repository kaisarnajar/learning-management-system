"use server";

import { revalidatePath } from "next/cache";
import { ensureAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin";

export async function toggleLike(blogPostId: string) {
  const { session, error } = await ensureAuth();
  if (error || !session) return { error };

  const userId = session.user.id;

  try {
    const existingLike = await prisma.blogLike.findUnique({
      where: {
        userId_blogPostId: {
          userId,
          blogPostId,
        },
      },
    });

    if (existingLike) {
      await prisma.blogLike.delete({
        where: { id: existingLike.id },
      });
    } else {
      await prisma.blogLike.create({
        data: {
          userId,
          blogPostId,
        },
      });
    }

    revalidatePath(`/blog/${blogPostId}`);
    revalidatePath(`/blog`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to toggle like:", err);
    return { error: "Failed to update like status" };
  }
}

export async function addComment(blogPostId: string, content: string) {
  const { session, error } = await ensureAuth();
  if (error || !session) return { error };

  if (!content || content.trim().length === 0) {
    return { error: "Comment content cannot be empty" };
  }

  const userId = session.user.id;

  try {
    const blogPost = await prisma.blogPost.findUnique({
      where: { id: blogPostId },
      select: { createdById: true, title: true },
    });

    if (!blogPost) {
      return { error: "Blog post not found" };
    }

    const comment = await prisma.blogComment.create({
      data: {
        userId,
        blogPostId,
        content: content.trim(),
      },
      include: {
        user: { select: { name: true, image: true, email: true } },
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
  } catch (err: any) {
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
  } catch (err: any) {
    console.error("Failed to delete comment:", err);
    return { error: "Failed to delete comment" };
  }
}

export async function editComment(commentId: string, content: string) {
  const { session, error } = await ensureAuth();
  if (error || !session) return { error };

  if (!content || content.trim().length === 0) {
    return { error: "Comment content cannot be empty" };
  }

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
  } catch (err: any) {
    console.error("Failed to edit comment:", err);
    return { error: "Failed to edit comment" };
  }
}
