import { NextRequest, NextResponse } from "next/server";
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

    const items = rawCartItems.map((item) => ({
      bookId: item.book.id,
      title: item.book.title,
      author: item.book.author,
      priceInrPaise: item.book.priceInrPaise,
      mrpInrPaise: item.book.mrpInrPaise,
      imagePath: item.book.imagePath,
      quantity: item.quantity,
      book: {
        id: item.book.id,
        title: item.book.title,
        author: item.book.author,
        description: item.book.description,
        priceInrPaise: item.book.priceInrPaise,
        mrpInrPaise: item.book.mrpInrPaise,
        status: item.book.status,
        imagePath: item.book.imagePath,
        category: "Islamic Books",
      },
    }));

    return NextResponse.json({
      success: true,
      data: items,
      items,
    });
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
        if (item.bookId && item.quantity > 0) {
          const bookExists = await tx.book.findUnique({
            where: { id: item.bookId },
          });

          if (bookExists) {
            await tx.userCartItem.create({
              data: {
                userId: user.id,
                bookId: item.bookId,
                quantity: item.quantity,
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

    const items = updatedRawItems.map((item) => ({
      bookId: item.book.id,
      title: item.book.title,
      author: item.book.author,
      priceInrPaise: item.book.priceInrPaise,
      mrpInrPaise: item.book.mrpInrPaise,
      imagePath: item.book.imagePath,
      quantity: item.quantity,
      book: {
        id: item.book.id,
        title: item.book.title,
        author: item.book.author,
        description: item.book.description,
        priceInrPaise: item.book.priceInrPaise,
        mrpInrPaise: item.book.mrpInrPaise,
        status: item.book.status,
        imagePath: item.book.imagePath,
        category: "Islamic Books",
      },
    }));

    return NextResponse.json({
      success: true,
      data: items,
      items,
    });
  } catch (error) {
    console.error("[api/v1/bookstore/cart] POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync bookstore cart." },
      { status: 500 }
    );
  }
}
