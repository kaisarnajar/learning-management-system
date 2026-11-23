import { NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { getCart, normalizeCartItems, replaceCart } from "@/services/cart";

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
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });

  try {
    return NextResponse.json(await getCart(userId));
  } catch (error) {
    console.error("[api/cart] GET Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch the cart." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await replaceCart(userId, normalizeCartItems(body?.items)));
  } catch (error) {
    console.error("[api/cart] POST Error:", error);
    return NextResponse.json({ success: false, error: "Failed to sync the cart." }, { status: 500 });
  }
}
