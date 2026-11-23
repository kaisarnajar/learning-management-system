import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { getCart, normalizeCartItems, replaceCart } from "@/services/cart";

/** The signed-in student's cart (published, in-stock books only). */
export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    return NextResponse.json(await getCart(user.id));
  } catch (error) {
    console.error("[api/v1/bookstore/cart] GET Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch bookstore cart." }, { status: 500 });
  }
}

/** Replaces the cart with `{ items: [{ bookId, quantity }] }`; books that cannot be bought are left out of the response. */
export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await replaceCart(user.id, normalizeCartItems(body?.items)));
  } catch (error) {
    console.error("[api/v1/bookstore/cart] POST Error:", error);
    return NextResponse.json({ success: false, error: "Failed to sync bookstore cart." }, { status: 500 });
  }
}
