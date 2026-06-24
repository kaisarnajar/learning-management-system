"use client";

import Image from "next/image";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { BookStatusBadge } from "@/components/bookstore/BookStatusBadge";
import { AddToCartButton } from "@/components/bookstore/AddToCartButton";
import type { BookWithDetails } from "@/lib/bookstore";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function BookCard({ book }: { book: BookWithDetails }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md">
      <TrackedLink
        href={`/bookstore/${book.id}`}
        eventName="View Book"
        pageName="/bookstore"
        className="relative block aspect-[4/5] w-full overflow-hidden bg-accent-muted/30"
      >
        {book.imagePath ? (
          <Image
            src={book.imagePath}
            alt={book.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/10 to-gold/10 p-6">
            <svg
              className="h-14 w-14 text-primary/40"
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
            <p className="text-center text-xs font-medium text-primary/50">{book.title}</p>
          </div>
        )}

        <div className="absolute right-2 top-2">
          <BookStatusBadge status={book.status} />
        </div>
      </TrackedLink>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex-1">
          <h2 className="font-serif text-base font-semibold leading-tight text-foreground line-clamp-2">
            <TrackedLink href={`/bookstore/${book.id}`} eventName="View Book" pageName="/bookstore" className="hover:text-gold">
              {book.title}
            </TrackedLink>
          </h2>
          <p className="mt-0.5 text-xs text-muted">{book.author}</p>
          <p className="mt-1.5 text-xs text-muted line-clamp-2">{book.description}</p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-primary">{formatPrice(book.priceInrPaise)}</span>
          {book.mrpInrPaise > book.priceInrPaise && (
            <span className="text-sm text-muted line-through">{formatPrice(book.mrpInrPaise)}</span>
          )}
        </div>

        <div className="mt-auto pt-4 space-y-2">
          <TrackedLink
            href={`/bookstore/${book.id}`}
            eventName="View Book"
            pageName="/bookstore"
            className="btn-gold-outline inline-flex w-full items-center justify-center py-2.5 text-xs"
          >
            Book Details
          </TrackedLink>
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
    </article>
  );
}
