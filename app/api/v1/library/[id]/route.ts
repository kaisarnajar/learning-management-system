import { NextRequest, NextResponse } from "next/server";
import { getLibraryItemById } from "@/services/library";
import { apiError, apiServerError } from "@/utils/api-response";

/** One published library item. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await getLibraryItemById(id);
    if (!item || !item.published) return apiError("Library item not found.", 404);
    return NextResponse.json({ success: true, item });
  } catch (error) {
    return apiServerError("api/v1/library/[id]", error, "Failed to fetch the library item.");
  }
}
