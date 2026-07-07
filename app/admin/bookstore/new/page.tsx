import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import Link from "next/link";
import { BookForm } from "@/components/admin/BookForm";
import { createBook } from "@/app/admin/bookstore/actions";
import { getFeaturedHomepageBookCount } from "@/services/bookstore";

export const metadata: Metadata = {
  title: "Add Book — Admin",
  description: `Add a new physical book to the ${BRAND_CONFIG.name} bookstore.`,
};

export default async function AdminBookstoreNewPage() {
  const featuredCount = await getFeaturedHomepageBookCount();

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

      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">Add New Book</h1>
      <p className="mt-1 text-sm text-muted">
        Fill in the book details. The book will appear in the bookstore once published.
      </p>

      <div className="mt-8 max-w-2xl">
        <BookForm featuredCount={featuredCount} action={createBook} submitLabel="Add Book" />
      </div>
    </div>
  );
}
