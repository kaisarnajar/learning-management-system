import type { BlogPostWithImages } from "@/lib/blogs";
import { formatBlogAuthorName, formatBlogDate } from "@/lib/blogs";
import Image from "next/image";
import { TrackedLink } from "@/components/analytics/TrackedLink";

type BlogPostCardProps = {
  post: BlogPostWithImages;
};

export function BlogPostCard({ post }: BlogPostCardProps) {
  const cover = post.images[0];
  const summary = post.excerpt || post.body.slice(0, 160) + (post.body.length > 160 ? "…" : "");
  const authorName = formatBlogAuthorName(post.createdBy);

  return (
    <article className="card-elevated flex h-full flex-col overflow-hidden transition-transform hover:-translate-y-0.5">
      {cover && (
        <TrackedLink href={`/blog/${post.id}`} eventName="Read Article" pageName="/blog" className="relative block aspect-[16/10] bg-background">
          <Image
            src={cover.imagePath}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </TrackedLink>
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs text-muted">{formatBlogDate(post.createdAt)}</p>
        <h2 className="mt-2 font-serif text-lg font-semibold text-foreground">
          <TrackedLink href={`/blog/${post.id}`} eventName="Read Article" pageName="/blog" className="line-clamp-2 block hover:text-gold">
            {post.title}
          </TrackedLink>
        </h2>
        <p className="mt-1 text-xs text-muted">By {authorName}</p>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{summary}</p>
        <TrackedLink
          href={`/blog/${post.id}`}
          eventName="Read Article"
          pageName="/blog"
          className="mt-4 text-sm font-semibold text-primary hover:underline"
        >
          Read more →
        </TrackedLink>
      </div>
    </article>
  );
}
