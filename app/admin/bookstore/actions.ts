"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/services/auth-actions";
import { saveBookImage, validateBookImage, deleteBookImage } from "@/services/bookstore-upload";
import { isUploadError } from "@/services/storage";
import { prisma } from "@/utils/prisma";
import { resolveBookFeaturedUpdate } from "@/services/bookstore";
import { bookSchema } from "@/utils/validations";
import { revalidatePublicContent } from "@/services/public-cache";

function parseBookForm(formData: FormData) {
  return bookSchema.safeParse({
    title: formData.get("title"),
    author: formData.get("author"),
    description: formData.get("description"),
    priceInr: formData.get("priceInr"),
    mrpInr: formData.get("mrpInr"),
    purchasePriceInr: formData.get("purchasePriceInr"),
    inventoryPurchased: formData.get("inventoryPurchased"),
    weightInGrams: formData.get("weightInGrams"),
    status: formData.get("status"),
    published: formData.get("published") === "true" || formData.get("published") === "on",
    featuredOnHomepage: formData.get("featuredOnHomepage") === "true" || formData.get("featuredOnHomepage") === "on",
  });
}

function revalidateBookstorePaths() {
  revalidatePath("/admin/bookstore", "page");
  revalidatePath("/admin/bookstore", "layout");
  revalidatePath("/bookstore", "page");

  revalidatePublicContent();
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
  const mrpInrPaise = parsed.data.mrpInr ? Math.round(parseFloat(parsed.data.mrpInr) * 100) : 0;
  const purchasePriceInrPaise = Math.round(parseFloat(parsed.data.purchasePriceInr) * 100);
  const inventoryPurchased = parseInt(parsed.data.inventoryPurchased, 10);
  const weightInGrams = parseInt(parsed.data.weightInGrams, 10);

  const featured = await resolveBookFeaturedUpdate({
    item: {
      published: parsed.data.published,
      featuredOnHomepage: false,
      featuredAt: null,
    },
    requestFeatured: parsed.data.featuredOnHomepage ?? false,
  });

  if ("error" in featured) {
    return { error: featured.error };
  }

  // Upload first, write the row once with its cover, and remove the object
  // again if the row cannot be created.
  let imagePath: string | undefined;
  try {
    if (imageFile && imageFile.size > 0) {
      imagePath = await saveBookImage("book", imageFile);
    }
    await prisma.book.create({
      data: {
        title: parsed.data.title,
        author: parsed.data.author,
        description: parsed.data.description,
        priceInrPaise,
        mrpInrPaise,
        purchasePriceInrPaise,
        inventoryPurchased,
        weightInGrams,
        status: parsed.data.status,
        published: parsed.data.published,
        ...(imagePath ? { imagePath } : {}),
        ...featured,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    if (imagePath) await deleteBookImage(imagePath);
    if (isUploadError(error)) return { error: error.message };
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
  const mrpInrPaise = parsed.data.mrpInr ? Math.round(parseFloat(parsed.data.mrpInr) * 100) : 0;
  const purchasePriceInrPaise = Math.round(parseFloat(parsed.data.purchasePriceInr) * 100);
  const inventoryPurchased = parseInt(parsed.data.inventoryPurchased, 10);
  const weightInGrams = parseInt(parsed.data.weightInGrams, 10);

  const existing = await prisma.book.findUnique({ where: { id: bookId } });
  if (!existing) return { error: "Book not found." };

  const featured = await resolveBookFeaturedUpdate({
    item: {
      published: parsed.data.published,
      featuredOnHomepage: existing.featuredOnHomepage,
      featuredAt: existing.featuredAt,
    },
    requestFeatured: parsed.data.featuredOnHomepage ?? false,
  });

  if ("error" in featured) {
    return { error: featured.error };
  }

  const removeImage = formData.get("removeImage") === "true";
  let imagePath: string | undefined | null;

  try {
    if (imageFile && imageFile.size > 0) {
      imagePath = await saveBookImage(bookId, imageFile);
    } else if (removeImage) {
      imagePath = null;
    }

    await prisma.book.update({
      where: { id: bookId },
      data: {
        title: parsed.data.title,
        author: parsed.data.author,
        description: parsed.data.description,
        priceInrPaise,
        mrpInrPaise,
        purchasePriceInrPaise,
        inventoryPurchased,
        weightInGrams,
        status: parsed.data.status,
        published: parsed.data.published,
        ...featured,
        ...(imagePath !== undefined ? { imagePath } : {}),
      },
    });
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    // The row still references the old cover: drop the new object, keep the old.
    if (imagePath) await deleteBookImage(imagePath);
    if (isUploadError(error)) return { error: error.message };
    console.error("Database error updating book:", error);
    return { error: "An unexpected error occurred while updating the book." };
  }

  // Committed: the previous cover is no longer referenced.
  if (imagePath !== undefined && existing.imagePath && existing.imagePath !== imagePath) {
    await deleteBookImage(existing.imagePath);
  }

  revalidateBookstorePaths();
  redirect("/admin/bookstore?updated=1");
}

export async function deleteBook(bookId: string): Promise<{ error?: string }> {
  await requireAdmin();

  try {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) return { error: "Book not found." };

    // Any order line (including shipped/refunded/declined history) references
    // this book; deleting would cascade those lines away and corrupt sales
    // history. Unpublish instead.
    const orderItemCount = await prisma.bookOrderItem.count({ where: { bookId } });

    if (orderItemCount > 0) {
      return {
        error:
          "This book appears in past or active orders and cannot be deleted. Unpublish it or set it to Out of Stock instead.",
      };
    }

    if (book.imagePath) {
      await deleteBookImage(book.imagePath);
    }

    await prisma.book.delete({ where: { id: bookId } });
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
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
