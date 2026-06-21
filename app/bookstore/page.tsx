import type { Metadata } from "next";
import Link from "next/link";
import { BookCard } from "@/components/bookstore/BookCard";
import { CartCount } from "@/components/bookstore/CartCount";
import { Pagination } from "@/components/shared/Pagination";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { getPublishedBooksPaginated } from "@/lib/bookstore";
import { GRID_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { Source_Serif_4 } from "next/font/google";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Bookstore",
  description:
    "Browse and purchase physical Islamic books from Darse Quran Academy. Add books to your cart and submit your order for approval.",
};

export default async function BookstorePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: GRID_PAGE_SIZE,
  });
  const q = parseSearchQuery(params.q);

  const { items: books, totalCount } = await getPublishedBooksPaginated(
    requestedPage,
    pageSize,
    q,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#003527] via-teal-900 to-[#002117] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="pattern-islamic absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50"></div>
        <div className="mx-auto max-w-4xl text-center">
          <div className="motion-safe:animate-fade-up">
            <h1 className={`${sourceSerif.className} text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl`}>
              Bookstore
            </h1>
            <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-[#cca72f]"></div>
            <p className="mt-8 text-lg leading-relaxed text-white/90 sm:text-xl">
              Browse our collection of physical Islamic books. Add to cart and submit your order — we&apos;ll confirm once payment is verified.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Search Form */}
          <div className="motion-safe:animate-fade-up mx-auto mb-10 max-w-2xl">
            <div className="card-elevated rounded-xl bg-surface p-4 shadow-md sm:p-5">
              <ListSearchForm action="/bookstore" query={q} placeholder="Search books by title or author..." />
            </div>
          </div>

          <div className="mx-auto max-w-7xl">
            {totalCount === 0 ? (
              <div className="motion-safe:animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-20 text-center">
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
                <div className="motion-safe:animate-fade-up mb-6 flex items-center justify-between">
                  <p className="text-sm text-muted">
                    {totalCount} {totalCount === 1 ? "book" : "books"} available
                  </p>
                  <Link
                    href="/profile/cart"
                    className="btn-gold-solid inline-flex items-center justify-center gap-2 min-h-11 rounded-full px-5 py-2 text-sm font-semibold shadow-md transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    View Cart
                    <CartCount />
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {books.map((book, index) => {
                    const animationDelay = `${(index % GRID_PAGE_SIZE) * 100}ms`;
                    return (
                      <div 
                        key={book.id}
                        className="motion-safe:animate-fade-up h-full"
                        style={{ animationDelay, animationFillMode: 'both' }}
                      >
                        <BookCard book={book} />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-16 motion-safe:animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                  <Pagination basePath="/bookstore" params={params} page={page} totalCount={totalCount} pageSize={pageSize} />
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
