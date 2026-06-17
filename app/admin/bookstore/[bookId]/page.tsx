import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookStatusBadge } from "@/components/bookstore/BookStatusBadge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { getBookById } from "@/lib/bookstore";
import { deleteBookFromProfile } from "@/app/admin/bookstore/actions";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default async function AdminBookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { bookId } = await params;
  const query = await searchParams;
  const book = await getBookById(bookId);

  if (!book) notFound();

  const deleteAction = deleteBookFromProfile.bind(null, bookId);

  return (
    <div>
      <Link href="/admin/bookstore" className="text-sm text-primary hover:underline">
        ← Back to bookstore
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Book details</h1>
          <p className="mt-1 text-sm text-muted">
            {book.author}
          </p>
        </div>
        <Link
          href={`/admin/bookstore/${bookId}/edit`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent-muted/50"
        >
          Edit book
        </Link>
      </div>

      {query.error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {decodeURIComponent(query.error)}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Cover image */}
        {book.imagePath && (
          <div className="h-48 w-36 shrink-0 overflow-hidden rounded-lg border border-border">
            <Image
              src={book.imagePath}
              alt={book.title}
              width={144}
              height={192}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <dl className="grid max-w-lg gap-3 text-sm">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-28">Title</dt>
            <dd className="text-muted">{book.title}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-28">Author</dt>
            <dd className="text-muted">{book.author}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-28">Price</dt>
            <dd className="text-muted">{formatPrice(book.priceInrPaise)}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-28">Availability</dt>
            <dd>
              <BookStatusBadge status={book.status} />
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-28">Visibility</dt>
            <dd>
              <StatusBadge published={book.published} />
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-28">Description</dt>
            <dd className="whitespace-pre-line text-muted">{book.description}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-28">Added</dt>
            <dd className="text-muted">
              {book.createdAt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </div>

      <DeleteForm action={deleteAction} label="Delete book" />
    </div>
  );
}
