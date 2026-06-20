import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { approveBlogPost, rejectBlogPost } from "@/app/admin/blog-approvals/actions";

import { getBlogPostForAdmin } from "@/lib/blogs";
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
        <div className="flex flex-wrap items-center gap-2">
          <ConfirmationModal title="Approve Blog Post" description="Approve this blog post and publish it on the public blog?" actionLabel="Approve" variant="primary" onConfirm={async () => { const result = await approveBlogPost(post.id, "/admin/blog-approvals"); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">Approve</button>} />
          <ConfirmationModal title="Reject Blog Post" description="Reject this blog post and mark it as declined?" actionLabel="Reject" variant="destructive" onConfirm={async () => { const result = await rejectBlogPost(post.id, "/admin/blog-approvals"); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Reject</button>} />
          <Link
            href={`/admin/blogs/${post.id}/edit`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent-muted/50"
          >
            Edit
          </Link>
        </div>
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
