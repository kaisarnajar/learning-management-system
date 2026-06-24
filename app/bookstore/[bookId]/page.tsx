import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Section } from "@/components/site/Section";
import { BookStatusBadge } from "@/components/bookstore/BookStatusBadge";
import { AddToCartButton } from "@/components/bookstore/AddToCartButton";
import { getBookById } from "@/lib/bookstore";

type BookPageProps = {
  params: Promise<{ bookId: string }>;
};

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { bookId } = await params;
  const book = await getBookById(bookId);
  if (!book || !book.published) return { title: "Book not found" };
  return {
    title: book.title,
    description: book.description.slice(0, 160),
  };
}

export default async function BookDetailPage({ params }: BookPageProps) {
  const { bookId } = await params;
  const book = await getBookById(bookId);

  // Return 404 if the book doesn't exist or isn't published
  if (!book || !book.published) notFound();

  return (
    <Section>
      <Link href="/bookstore" className="text-sm font-medium text-gold hover:underline">
        ← Back to Bookstore
      </Link>

      <article className="mx-auto mt-6 max-w-4xl">
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Left Column: Image & Add to Cart */}
          <div className="flex-shrink-0 md:w-1/3">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-accent-muted/30 shadow-sm">
              {book.imagePath ? (
                <Image
                  src={book.imagePath}
                  alt={book.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  priority
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/10 to-gold/10 p-6">
                  <svg
                    className="h-16 w-16 text-primary/40"
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
                  <p className="text-center text-sm font-medium text-primary/50">{book.title}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 hidden md:block">
              <AddToCartButton
                bookId={book.id}
                title={book.title}
                author={book.author}
                priceInrPaise={book.priceInrPaise}
                mrpInrPaise={book.mrpInrPaise}
                imagePath={book.imagePath}
                status={book.status}
              />
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-3">
              <BookStatusBadge status={book.status} />
            </div>

            <h1 className="font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              {book.title}
            </h1>
            <p className="mt-2 text-lg text-muted">by {book.author}</p>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">{formatPrice(book.priceInrPaise)}</span>
              {book.mrpInrPaise > book.priceInrPaise && (
                <span className="text-lg text-muted line-through">{formatPrice(book.mrpInrPaise)}</span>
              )}
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold text-foreground">Description</h2>
              <div className="mt-3 space-y-4 text-base leading-relaxed text-muted">
                {book.description.split('\\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="mt-8 md:hidden">
              <AddToCartButton
                bookId={book.id}
                title={book.title}
                author={book.author}
                priceInrPaise={book.priceInrPaise}
                mrpInrPaise={book.mrpInrPaise}
                imagePath={book.imagePath}
                status={book.status}
              />
            </div>
          </div>
        </div>
      </article>
    </Section>
  );
}
