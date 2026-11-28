import { prisma } from "@/utils/prisma";
import { rateLimit, RATE_LIMIT_MESSAGE, RATE_LIMITS } from "@/services/rate-limit";
import { BLOG_PUBLIC_WHERE } from "@/services/blog-approval";
import { createStudentNotification } from "@/services/notifications";
import { blogCommentSchema } from "@/utils/validations";
import { getBlogPostPath } from "@/utils/blog-path";

/**
 * Likes and comments on public blog posts, shared by the website's server
 * actions (app/blog/[id]/actions.ts) and the mobile API (/api/v1/blog/...).
 * Callers authenticate; these functions authorise and validate.
 */

export type EngagementUser = { id: string; name?: string | null; email?: string | null };

export type EngagementResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; status: 400 | 403 | 404 | 429 };

const commentInclude = { user: { select: { id: true, name: true, image: true } } } as const;

/** Only published, approved posts take likes and comments. */
async function findPublicPost(blogPostId: string) {
  return prisma.blogPost.findFirst({
    where: { id: blogPostId, ...BLOG_PUBLIC_WHERE },
    select: { id: true, slug: true, createdById: true, title: true },
  });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

function parseComment(content: unknown): { ok: true; content: string } | { ok: false; error: string; status: 400 } {
  const parsed = blogCommentSchema.safeParse(content);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Comment content cannot be empty", status: 400 };
  }
  return { ok: true, content: parsed.data.trim() };
}

/** Likes the post, or removes the like when there is one. */
export async function toggleBlogLike(
  userId: string,
  blogPostId: string,
): Promise<EngagementResult<{ liked: boolean; likeCount: number }>> {
  if (!(await findPublicPost(blogPostId))) return { ok: false, error: "Blog post not found", status: 404 };

  // Remove-then-create keeps a double click from creating two likes: the
  // second request finds nothing to delete and its create hits the unique
  // index, which counts as "already liked".
  const removed = await prisma.blogLike.deleteMany({ where: { userId, blogPostId } });
  let liked = false;
  if (removed.count === 0) {
    try {
      await prisma.blogLike.create({ data: { userId, blogPostId } });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
    liked = true;
  }
  const likeCount = await prisma.blogLike.count({ where: { blogPostId } });
  return { ok: true, liked, likeCount };
}

export async function addBlogComment(user: EngagementUser, blogPostId: string, rawContent: unknown) {
  const limit = await rateLimit(RATE_LIMITS.COMMENT_USER, user.id);
  if (!limit.ok) return { ok: false as const, error: RATE_LIMIT_MESSAGE, status: 429 as const };

  const parsed = parseComment(rawContent);
  if (!parsed.ok) return parsed;

  const blogPost = await findPublicPost(blogPostId);
  if (!blogPost) return { ok: false as const, error: "Blog post not found", status: 404 as const };

  const comment = await prisma.blogComment.create({
    data: { userId: user.id, blogPostId, content: parsed.content },
    include: commentInclude,
  });

  if (blogPost.createdById && blogPost.createdById !== user.id) {
    // Never the e-mail address: the post's author must not learn how to reach
    // a commenter who did not give a name.
    const commenterName = user.name?.trim() || "A reader";
    const preview = parsed.content.slice(0, 50) + (parsed.content.length > 50 ? "..." : "");
    await createStudentNotification({
      userId: blogPost.createdById,
      type: "BLOG_COMMENT_ADDED",
      title: `New comment on your blog "${blogPost.title}"`,
      body: `${commenterName} commented: "${preview}"`,
      href: `${getBlogPostPath(blogPost)}#comment-${comment.id}`,
    });
  }

  return { ok: true as const, comment };
}

/** Deletes a comment: its author, or an admin. */
export async function deleteBlogComment(
  user: { id: string; isAdmin: boolean },
  commentId: string,
): Promise<EngagementResult<{ blogPostId: string }>> {
  const comment = await prisma.blogComment.findUnique({ where: { id: commentId } });
  if (!comment) return { ok: false, error: "Comment not found", status: 404 };
  if (comment.userId !== user.id && !user.isAdmin) return { ok: false, error: "Unauthorized", status: 403 };

  await prisma.blogComment.delete({ where: { id: commentId } });
  return { ok: true, blogPostId: comment.blogPostId };
}

/** Edits a comment: its author only. */
export async function editBlogComment(userId: string, commentId: string, rawContent: unknown) {
  const parsed = parseComment(rawContent);
  if (!parsed.ok) return parsed;

  const comment = await prisma.blogComment.findUnique({ where: { id: commentId } });
  if (!comment) return { ok: false as const, error: "Comment not found", status: 404 as const };
  if (comment.userId !== userId) return { ok: false as const, error: "Unauthorized", status: 403 as const };

  const updated = await prisma.blogComment.update({
    where: { id: commentId },
    data: { content: parsed.content },
    include: commentInclude,
  });
  return { ok: true as const, comment: updated };
}
