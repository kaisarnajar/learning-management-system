import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteBlogPost, updateBlogPost } from "@/app/admin/blogs/actions";
import { ADMIN_ROLES, readActionForm, staffAction, staffRead } from "@/services/api-staff";
import { blogDetail, NOT_FOUND_CODE, withErrorCodes } from "@/services/api-content";
import { isTeacherSubmittedBlog } from "@/services/blog-approval";
import { MAX_BLOG_IMAGES } from "@/services/blog-limits";
import { getBlogPostForAdmin, getFeaturedHomepageBlogCount, HOMEPAGE_FEATURED_BLOGS_MAX } from "@/services/blogs";

type Params = { params: Promise<{ id: string }> };

const CODES = NOT_FOUND_CODE("Blog post");

/**
 * One post as /admin/blogs/[id]/edit loads it. `contentReadOnly`: a teacher's submission, whose title, summary,
 * content and images the admin cannot change (only publishing and the homepage setting).
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/blogs/[id]", async () => {
    const [post, featuredCount] = await Promise.all([getBlogPostForAdmin(id), getFeaturedHomepageBlogCount()]);
    if (!post) notFound();
    return {
      post: { ...blogDetail(post), contentReadOnly: isTeacherSubmittedBlog(post) },
      featuredCount,
      featuredMax: HOMEPAGE_FEATURED_BLOGS_MAX,
      maxImages: MAX_BLOG_IMAGES,
    };
  });
}

/** Edit (multipart): the create fields, plus removeImage (image ids, repeated) and more images. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/blogs/[id] PATCH", async () => {
    const form = await readActionForm(request);
    return withErrorCodes(() => updateBlogPost(id, form), CODES);
  });
}

/** Deletes the post and its images. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/blogs/[id] DELETE", () => withErrorCodes(() => deleteBlogPost(id), CODES));
}
