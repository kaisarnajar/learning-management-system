import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";
import { blogDetail } from "@/services/api-content";
import { getBlogPostForAdmin } from "@/services/blogs";
import { sanitizeRichText } from "@/services/rich-text";
import { stripHtml } from "@/utils/html";

type Params = { params: Promise<{ id: string }> };

/** A pending submission as /admin/blog-approvals/[id] shows it (404 once it is no longer pending). */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/blog-approvals/[id]", async () => {
    const post = await getBlogPostForAdmin(id);
    if (!post || post.approvalStatus !== "PENDING") notFound();
    return {
      post: {
        ...blogDetail(post),
        body: sanitizeRichText(post.body),
        excerpt: post.excerpt ? stripHtml(post.excerpt) : null,
      },
    };
  });
}
