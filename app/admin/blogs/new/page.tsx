import Link from "next/link";
import { createBlogPost } from "@/app/admin/blogs/actions";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { getFeaturedHomepageBlogCount, HOMEPAGE_FEATURED_BLOGS_MAX } from "@/services/blogs";

export default async function NewBlogPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [query, featuredCount] = await Promise.all([searchParams, getFeaturedHomepageBlogCount()]);

  return (
    <div>
      <Link href="/admin/blogs" className="text-sm text-primary hover:underline">
        ← Back to blogs
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">New blog post</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Write your article and attach screenshots or photos. Use &quot;Show on homepage&quot; to feature up
        to {HOMEPAGE_FEATURED_BLOGS_MAX} published posts in the Featured Blogs section; all published
        posts appear on the Blog page.
      </p>
      <div className="mt-8">
        <BlogPostForm
          action={createBlogPost}
          submitLabel="Create blog post"
          featuredCount={featuredCount}
          error={query.error ? decodeURIComponent(query.error) : undefined}
        />
      </div>
    </div>
  );
}
