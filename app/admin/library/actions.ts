"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { resolveLibraryFeaturedUpdate } from "@/lib/library";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { libraryItemSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

function parseLibraryForm(formData: FormData) {
  const pdfUrl = formData.get("pdfUrl");
  return libraryItemSchema.safeParse({
    title: formData.get("title"),
    author: formData.get("author"),
    topic: formData.get("topic"),
    level: formData.get("level"),
    language: formData.get("language"),
    pdfUrl: pdfUrl ? String(pdfUrl) : "",
    published: formData.get("published") === "on",
  });
}

export async function createLibraryItem(formData: FormData) {
  await requireAdmin();
  const parsed = parseLibraryForm(formData);
  if (!parsed.success) throw new Error("Invalid library item data");

  const featuredOnHomepage = formData.get("featuredOnHomepage") === "on";
  const featured = await resolveLibraryFeaturedUpdate({
    item: {
      published: parsed.data.published,
      featuredOnHomepage: false,
      featuredAt: null,
    },
    requestFeatured: featuredOnHomepage,
  });

  if ("error" in featured) {
    redirect(`/admin/library/new?saveError=${encodeURIComponent(featured.error)}`);
  }

  const data = {
    ...parsed.data,
    ...featured,
  };

  const id = await uniqueSlug(parsed.data.title, async (slug) => {
    return Boolean(await withDbErrorHandling(() => prisma.libraryItem.findUnique({ where: { id: slug } }), "Database operation failed"));
  });

  await withDbErrorHandling(() => prisma.libraryItem.create({ data: { id, ...data } }), "Database operation failed");

  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/admin/library");
  redirect("/admin/library?created=1");
}

export async function updateLibraryItem(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = parseLibraryForm(formData);
  if (!parsed.success) throw new Error("Invalid library item data");

  const existing = await withDbErrorHandling(() => prisma.libraryItem.findUnique({ where: { id } }), "Database operation failed");
  if (!existing) throw new Error("Library item not found");

  const featuredOnHomepage = formData.get("featuredOnHomepage") === "on";
  const featured = await resolveLibraryFeaturedUpdate({
    item: {
      published: parsed.data.published,
      featuredOnHomepage: existing.featuredOnHomepage,
      featuredAt: existing.featuredAt,
    },
    requestFeatured: featuredOnHomepage,
  });

  if ("error" in featured) {
    redirect(`/admin/library/${id}/edit?saveError=${encodeURIComponent(featured.error)}`);
  }

  await withDbErrorHandling(() => prisma.libraryItem.update({
      where: { id },
      data: {
        ...parsed.data,
        ...featured,
      },
    }), "Database operation failed");

  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/admin/library");
  revalidatePath(`/admin/library/${id}`);
  redirect("/admin/library?saved=1");
}

export async function deleteLibraryItemById(id: string): Promise<{ error?: string }> {
  await requireAdmin();

  const existing = await withDbErrorHandling(() => prisma.libraryItem.findUnique({ where: { id } }), "Database operation failed");
  if (!existing) {
    return { error: "Library item not found." };
  }

  await withDbErrorHandling(() => prisma.libraryItem.delete({ where: { id } }), "Database operation failed");

  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/admin/library");
  revalidatePath(`/admin/library/${id}`);

  return {};
}

export async function deleteLibraryItem(id: string) {
  const result = await deleteLibraryItemById(id);
  if (result.error) {
    redirect(`/admin/library/${id}/edit?saveError=${encodeURIComponent(result.error)}`);
  }
  redirect("/admin/library?deleted=1");
}

export async function deleteLibraryItemFromProfile(id: string) {
  const result = await deleteLibraryItemById(id);
  if (result.error) {
    redirect(`/admin/library/${id}?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/admin/library?deleted=1");
}
