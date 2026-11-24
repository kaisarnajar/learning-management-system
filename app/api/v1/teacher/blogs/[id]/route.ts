import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteTeacherBlogPost, updateTeacherBlogPost } from "@/app/teacher/(portal)/blogs/actions";
import { readActionForm, staffAction, staffRead, TEACHER_ROLES } from "@/services/api-staff";
import { blogDetail, withErrorCodes } from "@/services/api-content";
import { canTeacherDeleteBlogPost, canTeacherEditBlogPost } from "@/services/blog-approval";
import { MAX_BLOG_IMAGES } from "@/services/blog-limits";
import { getBlogPostForTeacher } from "@/services/blogs";

type Params = { params: Promise<{ id: string }> };

const CODES = {
  notfound: { message: "Blog post not found.", status: 404 },
  locked: { message: "This post can no longer be edited because it has been approved or is awaiting review.", status: 409 },
};

/** One of the teacher's own posts, as /teacher/blogs/[id]/edit loads it (404 for anyone else's). */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, TEACHER_ROLES, "api/v1/teacher/blogs/[id]", async ({ user }) => {
    const post = await getBlogPostForTeacher(id, user.id);
    if (!post) notFound();
    return {
      post: { ...blogDetail(post), canEdit: canTeacherEditBlogPost(post, user.id), canDelete: canTeacherDeleteBlogPost(post, user.id) },
      maxImages: MAX_BLOG_IMAGES,
    };
  });
}

/** Edits and resubmits the post for approval (multipart): title, excerpt, body, removeImage (ids), images. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, TEACHER_ROLES, "api/v1/teacher/blogs/[id] PATCH", async () => {
    const form = await readActionForm(request);
    return withErrorCodes(() => updateTeacherBlogPost(id, form), CODES);
  });
}

/** Deletes one of the teacher's own posts. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, TEACHER_ROLES, "api/v1/teacher/blogs/[id] DELETE", () =>
    withErrorCodes(() => deleteTeacherBlogPost(id), CODES),
  );
}
