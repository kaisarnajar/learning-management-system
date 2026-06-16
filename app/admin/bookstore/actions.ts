"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { validateBookForm } from "@/lib/admin-form-validation";
import { saveBookImage, validateBookImage } from "@/lib/bookstore-upload";
import { prisma } from "@/lib/prisma";
import type { BookStatus } from "@prisma/client";

function revalidateBookstorePaths() {
  revalidatePath("/admin/bookstore", "page");
  revalidatePath("/admin/bookstore", "layout");
  revalidatePath("/bookstore", "page");
  revalidatePath("/admin", "page");
}

export async function createBook(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();

  const title = (formData.get("title") as string) ?? "";
  const author = (formData.get("author") as string) ?? "";
  const description = (formData.get("description") as string) ?? "";
  const priceInr = (formData.get("priceInr") as string) ?? "";
  const status = (formData.get("status") as string) ?? "AVAILABLE";
  const published = formData.get("published") === "true";
  const imageFile = formData.get("image") as File | null;

  const validation = validateBookForm({
    title,
    author,
    description,
    priceInr,
    status: status as BookStatus,
    published,
  });

  if (!validation.success) {
    return { error: validation.issues?.[0]?.message ?? "Invalid form data." };
  }

  // Validate image
  if (imageFile && imageFile.size > 0) {
    const { error } = validateBookImage(imageFile);
    if (error) return { error };
  }

  const priceInrPaise = Math.round(parseFloat(priceInr) * 100);

  const book = await prisma.book.create({
    data: {
      title: title.trim(),
      author: author.trim(),
      description: description.trim(),
      priceInrPaise,
      status: status as BookStatus,
      published,
    },
  });

  // Save image after book is created (needs book id)
  if (imageFile && imageFile.size > 0) {
    const imagePath = await saveBookImage(book.id, imageFile);
    await prisma.book.update({
      where: { id: book.id },
      data: { imagePath },
    });
  }

  revalidateBookstorePaths();
  redirect("/admin/bookstore?created=1");
}

export async function updateBook(bookId: string, formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();

  const title = (formData.get("title") as string) ?? "";
  const author = (formData.get("author") as string) ?? "";
  const description = (formData.get("description") as string) ?? "";
  const priceInr = (formData.get("priceInr") as string) ?? "";
  const status = (formData.get("status") as string) ?? "AVAILABLE";
  const published = formData.get("published") === "true";
  const imageFile = formData.get("image") as File | null;

  const validation = validateBookForm({
    title,
    author,
    description,
    priceInr,
    status: status as BookStatus,
    published,
  });

  if (!validation.success) {
    return { error: validation.issues?.[0]?.message ?? "Invalid form data." };
  }

  if (imageFile && imageFile.size > 0) {
    const { error } = validateBookImage(imageFile);
    if (error) return { error };
  }

  const priceInrPaise = Math.round(parseFloat(priceInr) * 100);

  let imagePath: string | undefined;
  if (imageFile && imageFile.size > 0) {
    imagePath = await saveBookImage(bookId, imageFile);
  }

  await prisma.book.update({
    where: { id: bookId },
    data: {
      title: title.trim(),
      author: author.trim(),
      description: description.trim(),
      priceInrPaise,
      status: status as BookStatus,
      published,
      ...(imagePath ? { imagePath } : {}),
    },
  });

  revalidateBookstorePaths();
  redirect("/admin/bookstore?updated=1");
}

export async function deleteBook(bookId: string): Promise<{ error?: string }> {
  await requireAdmin();

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return { error: "Book not found." };

  // Check for any non-declined orders containing this book
  const activeOrderItem = await prisma.bookOrderItem.findFirst({
    where: {
      bookId,
      order: { status: { in: ["PENDING_VERIFICATION", "APPROVED"] } },
    },
  });

  if (activeOrderItem) {
    return {
      error:
        "Cannot delete a book with existing active or pending orders. Set it to Out of Stock instead.",
    };
  }

  await prisma.book.delete({ where: { id: bookId } });

  revalidateBookstorePaths();
  return {};
}
