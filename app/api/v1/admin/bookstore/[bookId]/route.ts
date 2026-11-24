import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteBook, updateBook } from "@/app/admin/bookstore/actions";
import { ADMIN_ROLES, readActionForm, staffAction, staffRead } from "@/services/api-staff";
import { getBookById, getFeaturedHomepageBookCount } from "@/services/bookstore";
import { getStockLevels } from "@/services/inventory";
import { prisma } from "@/utils/prisma";
import { BOOK_STATUS_OPTIONS, featuredSlots, serializeBook } from "../serialize";

type Params = { params: Promise<{ bookId: string }> };

/**
 * One book as on /admin/bookstore/[bookId] and its edit form, with the homepage slots in use and its stock
 * (purchased + adjustments − copies held by approved or shipped orders, see services/inventory.ts).
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { bookId } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/bookstore/[bookId]", async () => {
    const [book, featuredCount, stock] = await Promise.all([
      getBookById(bookId),
      getFeaturedHomepageBookCount(),
      getStockLevels(prisma, [bookId]),
    ]);
    if (!book) notFound();
    const level = stock.get(bookId);
    return {
      book: serializeBook(book),
      stock: level
        ? { purchased: level.purchased, adjustments: level.adjustments, committed: level.committed, available: level.available }
        : null,
      statusOptions: BOOK_STATUS_OPTIONS,
      ...featuredSlots(featuredCount),
    };
  });
}

/**
 * Saves the edit form: the same fields as POST /admin/bookstore, plus removeImage ("true" drops the cover when no
 * new image is sent).
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { bookId } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/bookstore/[bookId] PATCH", async () =>
    updateBook(bookId, await readActionForm(request)),
  );
}

/** Deletes the book (refused once it appears in any order: unpublish it instead). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { bookId } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/bookstore/[bookId] DELETE", () => deleteBook(bookId));
}
