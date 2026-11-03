import { NextRequest, NextResponse } from "next/server";
import { MAX_ORDER_QTY } from "@/config/constants/business";
import { toCartResponse } from "@/services/api-dto";
import { requireStudentApiAuth } from "@/services/api-auth";
import { prisma } from "@/utils/prisma";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const rawCartItems = await prisma.userCartItem.findMany({
      where: { userId: user.id },
      include: {
        book: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(toCartResponse(rawCartItems));
  } catch (error) {
    console.error("[api/v1/bookstore/cart] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookstore cart." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const inputItems: Array<{ bookId: string; quantity: number }> = Array.isArray(body.items)
      ? body.items
      : [];

    await prisma.$transaction(async (tx) => {
      await tx.userCartItem.deleteMany({
        where: { userId: user.id },
      });

      for (const item of inputItems) {
        if (
          typeof item.bookId === "string" &&
          item.bookId &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0
        ) {
          const bookExists = await tx.book.findUnique({
            where: { id: item.bookId },
          });

          if (bookExists) {
            await tx.userCartItem.create({
              data: {
                userId: user.id,
                bookId: item.bookId,
                quantity: Math.min(item.quantity, MAX_ORDER_QTY),
              },
            });
          }
        }
      }
    });

    const updatedRawItems = await prisma.userCartItem.findMany({
      where: { userId: user.id },
      include: {
        book: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(toCartResponse(updatedRawItems));
  } catch (error) {
    console.error("[api/v1/bookstore/cart] POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync bookstore cart." },
      { status: 500 }
    );
  }
}
