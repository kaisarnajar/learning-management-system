import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { deleteLibraryItemFromProfile } from "@/app/admin/library/actions";
import { getLibraryItemById } from "@/lib/library";

export default async function AdminLibraryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const item = await getLibraryItemById(id);

  if (!item) notFound();

  const deleteAction = deleteLibraryItemFromProfile.bind(null, id);

  return (
    <div>
      <Link href="/admin/library" className="text-sm text-primary hover:underline">
        ← Back to library
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Library item</h1>
          <p className="mt-1 text-sm text-muted">
            {item.author} · {item.topic}
          </p>
        </div>
        <Link
          href={`/admin/library/${id}/edit`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent-muted/50"
        >
          Edit item
        </Link>
      </div>

      {query.error && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {decodeURIComponent(query.error)}
        </p>
      )}

      <dl className="mt-6 grid max-w-lg gap-3 text-sm">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Title</dt>
          <dd className="text-muted">{item.title}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Author</dt>
          <dd className="text-muted">{item.author}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Topic</dt>
          <dd className="text-muted">{item.topic}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Level</dt>
          <dd className="text-muted">{item.level}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Language</dt>
          <dd className="text-muted">{item.language}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Status</dt>
          <dd>
            <StatusBadge published={item.published} />
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Homepage</dt>
          <dd className="text-muted">
            {item.featuredOnHomepage && item.published ? "Featured" : "Not featured"}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">PDF</dt>
          <dd className="break-all text-muted">
            {item.pdfUrl ? (
              <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {item.pdfUrl}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Added</dt>
          <dd className="text-muted">
            {item.createdAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </dd>
        </div>
      </dl>

      <DeleteForm action={deleteAction} label="Delete item" />
    </div>
  );
}
