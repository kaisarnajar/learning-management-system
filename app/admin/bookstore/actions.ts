"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { saveBookImage, validateBookImage, deleteBookImage } from "@/lib/bookstore-upload";
import { prisma } from "@/lib/prisma";
import { bookSchema } from "@/lib/validations";

function parseBookForm(formData: FormData) {
  return bookSchema.safeParse({
    title: formData.get("title"),
    author: formData.get("author"),
    description: formData.get("description"),
    priceInr: formData.get("priceInr"),
    status: formData.get("status"),
    published: formData.get("published") === "true" || formData.get("published") === "on",
  });
}

function revalidateBookstorePaths() {
  revalidatePath("/admin/bookstore", "page");
  revalidatePath("/admin/bookstore", "layout");
  revalidatePath("/bookstore", "page");
  revalidatePath("/admin", "page");
}

export async function createBook(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();

  const parsed = parseBookForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const { error } = validateBookImage(imageFile);
    if (error) return { error };
  }

  const priceInrPaise = Math.round(parseFloat(parsed.data.priceInr) * 100);

  try {
    const book = await prisma.book.create({
      data: {
        title: parsed.data.title,
        author: parsed.data.author,
        description: parsed.data.description,
        priceInrPaise,
        status: parsed.data.status,
        published: parsed.data.published,
      },
    });

    if (imageFile && imageFile.size > 0) {
      const imagePath = await saveBookImage(book.id, imageFile);
      await prisma.book.update({
        where: { id: book.id },
        data: { imagePath },
      });
    }
  } catch (error) {
    console.error("Database error creating book:", error);
    return { error: "An unexpected error occurred while creating the book." };
  }

  revalidateBookstorePaths();
  redirect("/admin/bookstore?created=1");
}

export async function updateBook(bookId: string, formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();

  const parsed = parseBookForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const { error } = validateBookImage(imageFile);
    if (error) return { error };
  }

  const priceInrPaise = Math.round(parseFloat(parsed.data.priceInr) * 100);

  try {
    let imagePath: string | undefined;
    if (imageFile && imageFile.size > 0) {
      imagePath = await saveBookImage(bookId, imageFile);
    }

    await prisma.book.update({
      where: { id: bookId },
      data: {
        title: parsed.data.title,
        author: parsed.data.author,
        description: parsed.data.description,
        priceInrPaise,
        status: parsed.data.status,
        published: parsed.data.published,
        ...(imagePath ? { imagePath } : {}),
      },
    });
  } catch (error) {
    console.error("Database error updating book:", error);
    return { error: "An unexpected error occurred while updating the book." };
  }

  revalidateBookstorePaths();
  redirect("/admin/bookstore?updated=1");
}

export async function deleteBook(bookId: string): Promise<{ error?: string }> {
  await requireAdmin();

  try {
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

    if (book.imagePath) {
      await deleteBookImage(book.imagePath);
    }

    await prisma.book.delete({ where: { id: bookId } });
  } catch (error) {
    console.error("Database error deleting book:", error);
    return { error: "An unexpected error occurred while deleting the book." };
  }

  revalidateBookstorePaths();
  return {};
}

export async function deleteBookFromProfile(bookId: string) {
  const result = await deleteBook(bookId);
  if (result.error) {
    redirect(`/admin/bookstore/${bookId}?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/admin/bookstore?deleted=1");
}
