import type { Metadata } from "next";
import Link from "next/link";
import { BookCard } from "@/components/bookstore/BookCard";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/site/Section";
import { getPublishedBooks } from "@/lib/bookstore";

export const metadata: Metadata = {
  title: "Bookstore",
  description:
    "Browse and purchase physical Islamic books from Darse Quran Academy. Add books to your cart and submit your order for approval.",
};

export default async function BookstorePage() {
  const books = await getPublishedBooks();

  return (
    <Section>
      <PageHeader
        title="Bookstore"
        description="Browse our collection of physical Islamic books. Add to cart and submit your order — we'll confirm once payment is verified."
      />

      <div className="mx-auto mt-10 max-w-7xl">
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-20 text-center">
            <svg
              className="h-16 w-16 text-muted/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p className="mt-4 font-serif text-lg font-semibold text-foreground">
              No books available yet
            </p>
            <p className="mt-1 text-sm text-muted">
              Check back soon — we&apos;re adding our book catalog.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted">
                {books.length} {books.length === 1 ? "book" : "books"} available
              </p>
              <Link
                href="/profile/cart"
                className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                View Cart
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
