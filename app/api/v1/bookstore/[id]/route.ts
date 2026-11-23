import { NextRequest, NextResponse } from "next/server";
import { getBookById } from "@/services/bookstore";
import { toPublicBookDto } from "@/services/api-dto";
import { apiError, apiServerError } from "@/utils/api-response";

/** One published book. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const book = await getBookById(id);
    if (!book || !book.published) return apiError("Book not found.", 404);
    return NextResponse.json({ success: true, book: toPublicBookDto(book) });
  } catch (error) {
    return apiServerError("api/v1/bookstore/[id]", error, "Failed to fetch the book.");
  }
}
