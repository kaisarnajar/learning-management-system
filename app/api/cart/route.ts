import { NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { getCart, normalizeCartItems, replaceCart } from "@/services/cart";
import { apiError, apiServerError } from "@/utils/api-response";

/**
 * The website's cart sync (CartProvider). Same behaviour as
 * /api/v1/bookstore/cart, authenticated by the browser session instead of a
 * Bearer token: /api/v1 is Bearer-only, so the web cannot use that route.
 */
export const dynamic = "force-dynamic";

async function sessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return apiError("Unauthorized.", 401);

  try {
    return NextResponse.json(await getCart(userId));
  } catch (error) {
    return apiServerError("api/cart", error, "Failed to fetch the cart.");
  }
}

export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return apiError("Unauthorized.", 401);

  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await replaceCart(userId, normalizeCartItems(body?.items)));
  } catch (error) {
    return apiServerError("api/cart", error, "Failed to sync the cart.");
  }
}
