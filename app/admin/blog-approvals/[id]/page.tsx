import Link from "next/link";
import { notFound } from "next/navigation";


import { getBlogPostForAdmin } from "@/lib/blogs";
import { BlogApprovalActions } from "@/components/admin/BlogApprovalActions";
import Image from "next/image";

export default async function AdminBlogApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getBlogPostForAdmin(id);

  if (!post || post.approvalStatus !== "PENDING") notFound();

  const submittedBy = post.createdBy?.name ?? post.createdBy?.email ?? "Teacher";

  return (
    <div>
      <Link href="/admin/blog-approvals" className="text-sm text-primary hover:underline">
        ← Back to blog approvals
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">{post.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Submitted by {submittedBy}
            {post.createdBy?.email && post.createdBy.name ? ` · ${post.createdBy.email}` : ""}
          </p>
        </div>
        <BlogApprovalActions postId={post.id} />
      </div>

      <dl className="mt-6 grid max-w-2xl gap-3 text-sm">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-32">Submitted</dt>
          <dd className="text-muted">
            {post.createdAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-32">Images</dt>
          <dd className="text-muted">{post.images.length}</dd>
        </div>
        {post.excerpt && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-32">Excerpt</dt>
            <dd className="text-muted">{post.excerpt}</dd>
          </div>
        )}
      </dl>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold text-foreground">Content</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post.body}</p>
      </section>

      {post.images.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-semibold text-foreground">Images</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {post.images.map((img) => (
              <li key={img.id} className="overflow-hidden rounded-md border border-border">
                <div className="relative aspect-video bg-background">
                  <Image
                    src={img.imagePath}
                    alt={img.caption ?? ""}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 100vw, 400px"
                  />
                </div>
                {img.caption && <p className="px-3 py-2 text-xs text-muted">{img.caption}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
