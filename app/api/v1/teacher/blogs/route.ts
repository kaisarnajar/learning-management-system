import { NextRequest } from "next/server";
import { createTeacherBlogPost } from "@/app/teacher/(portal)/blogs/actions";
import { pagedBody, readActionForm, staffAction, staffListParams, staffRead, TEACHER_ROLES } from "@/services/api-staff";
import { blogRow } from "@/services/api-content";
import { canTeacherDeleteBlogPost, canTeacherEditBlogPost } from "@/services/blog-approval";
import { MAX_BLOG_IMAGES } from "@/services/blog-limits";
import { getTeacherBlogPostsPaginated } from "@/services/blogs";

/** The signed-in teacher's own posts, newest first, as on /teacher/blogs. */
export async function GET(request: NextRequest) {
  return staffRead(request, TEACHER_ROLES, "api/v1/teacher/blogs", async ({ user }) => {
    const { page, pageSize } = staffListParams(request);
    const { items, totalCount } = await getTeacherBlogPostsPaginated(user.id, page, pageSize);
    return {
      ...pagedBody(
        items.map((post) => ({
          ...blogRow(post),
          canEdit: canTeacherEditBlogPost(post, user.id),
          canDelete: canTeacherDeleteBlogPost(post, user.id),
        })),
        totalCount,
        page,
        pageSize,
      ),
      maxImages: MAX_BLOG_IMAGES,
    };
  });
}

/** Submits a new post for approval (multipart): title, excerpt, body (HTML), images (files, repeated). */
export async function POST(request: NextRequest) {
  return staffAction(request, TEACHER_ROLES, "api/v1/teacher/blogs POST", async () =>
    createTeacherBlogPost(await readActionForm(request)),
  );
}
