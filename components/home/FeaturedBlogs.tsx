import { TrackedLink } from "@/components/analytics/TrackedLink";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { SplitSectionTitle } from "@/components/site/SplitSectionTitle";
import { getFeaturedHomepageBlogPosts } from "@/lib/blogs";

export async function FeaturedBlogs() {
  const posts = await getFeaturedHomepageBlogPosts();

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <div className="text-center sm:text-left">
            <SplitSectionTitle muted="Featured" accent="Blogs" />
            <p className="mt-3 max-w-xl text-sm text-muted sm:text-base">
              Articles and reflections from our teachers and scholars.
            </p>
          </div>
          <TrackedLink href="/blogs" eventName="View All Blogs" pageName="/" className="btn-gold-solid inline-flex px-8 py-3 text-sm">
            View all
          </TrackedLink>
        </div>
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {posts.map((post) => (
            <li key={post.id}>
              <BlogPostCard post={post} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
