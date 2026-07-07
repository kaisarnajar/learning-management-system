import Link from "next/link";
import { notFound } from "next/navigation";
import { updateBlogPost } from "@/app/admin/blogs/actions";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { isTeacherSubmittedBlog } from "@/services/blog-approval";
import { getBlogPostForAdmin, getFeaturedHomepageBlogCount } from "@/services/blogs";
import { ActionToast } from "@/components/shared/ToastProvider";


export default async function EditBlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; posted?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [post, featuredCount] = await Promise.all([getBlogPostForAdmin(id), getFeaturedHomepageBlogCount()]);

  if (!post) notFound();

  const contentReadOnly = isTeacherSubmittedBlog(post);
  const action = updateBlogPost.bind(null, id);

  return (
    <div>
      <Link
        href={contentReadOnly ? "/admin/blog-approvals" : "/admin/blogs"}
        className="text-sm text-primary hover:underline"
      >
        {contentReadOnly ? "← Back to blog approvals" : "← Back to blogs"}
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">
        {contentReadOnly ? "Review blog post" : "Edit blog post"}
      </h1>

      <ActionToast trigger={query.saved === "1"} paramName="saved" message="Changes saved." variant="info" />
      <ActionToast trigger={query.posted === "1"} paramName="posted" message="Blog post created." variant="info" />

      <div className="mt-8">
        <BlogPostForm
          post={post}
          action={action}
          submitLabel="Save changes"
          featuredCount={featuredCount}
          contentReadOnly={contentReadOnly}
          error={query.error ? decodeURIComponent(query.error) : undefined}
        />
      </div>
    </div>
  );
}
