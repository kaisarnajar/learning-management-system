import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BookStatusBadge } from "@/components/bookstore/BookStatusBadge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteBookButton } from "@/components/admin/DeleteBookButton";
import { getAllBooks } from "@/lib/bookstore";

export const metadata: Metadata = {
  title: "Bookstore — Admin",
  description: "Manage the physical book catalog for the Darse Quran Academy bookstore.",
};

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default async function AdminBookstorePage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; deleted?: string }>;
}) {
  const params = await searchParams;
  const books = await getAllBooks();

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Bookstore</h1>
          <p className="mt-1 text-sm text-muted">{books.length} total</p>
        </div>
        <Link
          href="/admin/bookstore/new"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
        >
          Add book
        </Link>
      </div>

      {params.created === "1" && (
        <p className="mt-4 rounded-md bg-violet-50 px-4 py-3 text-sm text-violet-800">Book created.</p>
      )}
      {params.updated === "1" && (
        <p className="mt-4 rounded-md bg-violet-50 px-4 py-3 text-sm text-violet-800">Changes saved.</p>
      )}
      {params.deleted === "1" && (
        <p className="mt-4 rounded-md bg-violet-50 px-4 py-3 text-sm text-violet-800">Book deleted.</p>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        {books.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">No books yet.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Book</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {books.map((book) => (
                <tr key={book.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-9 shrink-0 overflow-hidden rounded border border-border">
                        {book.imagePath ? (
                          <Image
                            src={book.imagePath}
                            alt={book.title}
                            width={36}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-accent-muted/30">
                            <svg className="h-4 w-4 text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{book.title}</p>
                        <p className="text-xs text-muted">{book.author}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{formatPrice(book.priceInrPaise)}</td>
                  <td className="px-4 py-3">
                    <BookStatusBadge status={book.status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge published={book.published} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/admin/bookstore/${book.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/bookstore/${book.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteBookButton bookId={book.id} bookTitle={book.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
