import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookForm } from "@/components/admin/BookForm";
import { updateBook } from "@/app/admin/bookstore/actions";
import { getBookById, getFeaturedHomepageBookCount } from "@/services/bookstore";

export const metadata: Metadata = {
  title: "Edit Book — Admin",
  description: "Update book details, availability status, and cover image.",
};

export default async function AdminBookEditPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const [book, featuredCount] = await Promise.all([
    getBookById(bookId),
    getFeaturedHomepageBookCount(),
  ]);

  if (!book) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    return updateBook(bookId, formData);
  }

  return (
    <div>
      <Link
        href="/admin/bookstore"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Bookstore
      </Link>

      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">Edit Book</h1>
      <p className="mt-1 max-w-lg text-sm text-muted">
        Update details for <strong>{book.title}</strong>.
      </p>

      <div className="mt-8 max-w-2xl">
        <BookForm book={book} featuredCount={featuredCount} action={handleUpdate} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
