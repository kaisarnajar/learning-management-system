import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/site/Section";
import { formatBlogDate, getPublishedBlogPostById } from "@/services/blogs";
import { auth } from "@/services/auth";
import { isAdminSession } from "@/services/admin";
import { BlogEngagement } from "./BlogEngagement";

import { BRAND_CONFIG } from "@/config/brand";
import { JsonLd } from "@/components/site/JsonLd";
import { getBlogPostingSchema, getBreadcrumbSchema } from "@/services/seo-schema";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPublishedBlogPostById(id);
  if (!post) return { title: "Post not found" };

  const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");
  const postUrl = `${baseUrl}/blog/${post.id}`;
  const description = post.excerpt || post.body.slice(0, 160).replace(/[#*`]/g, "");
  const imageUrl = post.images && post.images.length > 0 ? post.images[0].imagePath : BRAND_CONFIG.seo.openGraphImage;

  return {
    title: post.title,
    description: description,
    alternates: {
      canonical: postUrl,
    },
    openGraph: {
      title: `${post.title} | ${BRAND_CONFIG.name}`,
      description: description,
      url: postUrl,
      siteName: BRAND_CONFIG.name,
      type: "article",
      publishedTime: new Date(post.createdAt).toISOString(),
      authors: post.createdBy?.name ? [post.createdBy.name] : [BRAND_CONFIG.name],
      images: [
        {
          url: imageUrl,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: description,
      images: [imageUrl],
    },
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


  const blogPostingSchema = getBlogPostingSchema({
    id: post.id,
    title: post.title,
    excerpt: post.excerpt ?? undefined,
    body: post.body,
    authorName: post.createdBy?.name ?? undefined,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    imageUrl: post.images && post.images.length > 0 ? post.images[0].imagePath : undefined,
  });

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: post.title, url: `/blog/${post.id}` },
  ]);

  return (
    <Section>
      <JsonLd data={[blogPostingSchema, breadcrumbSchema]} />
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
