import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/site/Section";
import { formatBlogDate, getPublishedBlogPostById } from "@/services/blogs";
import { auth } from "@/services/auth";
import { isAdminSession } from "@/services/admin";
import { BlogEngagement } from "./BlogEngagement";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPublishedBlogPostById(id);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt || post.body.slice(0, 160),
  };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [post, session] = await Promise.all([
    getPublishedBlogPostById(id),
    auth(),
  ]);

  if (!post) notFound();

  const currentUserId = session?.user?.id;
  const isAdmin = isAdminSession(session);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialHasLiked = currentUserId ? (post as any).likes?.some((like: any) => like.userId === currentUserId) : false;


  return (
    <Section>
      <Link href="/blog" className="text-sm font-medium text-gold hover:underline">
        ← All blog posts
      </Link>

      <article className="mx-auto mt-6 max-w-3xl">
        <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">{post.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {formatBlogDate(post.createdAt)}
          {post.createdBy?.name ? ` · ${post.createdBy.name}` : ""}
        </p>

        {post.excerpt && (
          <p className="mt-4 text-lg leading-relaxed text-muted">{post.excerpt}</p>
        )}

        <div
          dangerouslySetInnerHTML={{ __html: post.body }}
          className="blog-content mt-8 text-base leading-relaxed text-foreground"
        />

        {post.images.length > 0 && (
          <div className="mt-10 space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Gallery</h2>
            {post.images.map((img) => (
              <figure
                key={img.id}
                className="overflow-hidden rounded-xl border border-border bg-background"
              >
                <div className="relative w-full">
                  <Image
                    src={img.imagePath}
                    alt={img.caption ?? ""}
                    width={1200}
                    height={800}
                    className="h-auto w-full object-contain"
                    sizes="(max-width: 768px) 100vw, 768px"
                  />
                </div>
                {img.caption && (
                  <figcaption className="px-4 py-2 text-center text-sm text-muted">
                    {img.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        <BlogEngagement
          blogPostId={post.id}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialLikeCount={(post as any).likes?.length || 0}
          initialHasLiked={initialHasLiked ?? false}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialComments={(post as any).comments || []}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      </article>
    </Section>
  );
}
