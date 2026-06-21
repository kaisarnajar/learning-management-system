import { TrackedLink } from "@/components/analytics/TrackedLink";
import { BookCard } from "@/components/bookstore/BookCard";
import { SplitSectionTitle } from "@/components/site/SplitSectionTitle";
import { getFeaturedHomepageBooks } from "@/lib/bookstore";

export async function FeaturedBooks() {
  const books = await getFeaturedHomepageBooks();

  if (books.length === 0) {
    return null;
  }

  return (
    <section className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <div className="text-center sm:text-left">
            <SplitSectionTitle muted="Recommended" accent="Books" />
            <p className="mt-3 max-w-xl text-sm text-muted sm:text-base">
              Recommended titles available in the academy bookstore.
            </p>
          </div>
          <TrackedLink href="/bookstore" eventName="View All Books" pageName="/" className="btn-gold-outline inline-flex shrink-0 px-6 py-2.5 text-sm">
            View all
          </TrackedLink>
        </div>
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {books.map((book) => (
            <li key={book.id}>
              <BookCard book={book} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
