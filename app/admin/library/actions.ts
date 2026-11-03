"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/services/auth-actions";
import { resolveLibraryFeaturedUpdate } from "@/services/library";
import { deleteLibraryImage, saveLibraryImage, validateLibraryImage } from "@/services/library-upload";
import { prisma } from "@/utils/prisma";
import { createWithUniqueSlug } from "@/utils/slug";
import { libraryItemSchema } from "@/utils/validations";
import { withDbErrorHandling } from "@/utils/db-error";
import { ActionError, executeServerAction } from "@/utils/action-utils";
import { withFlash } from "@/utils/flash";

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
  return executeServerAction(async () => {
  await requireAdmin();
  const parsed = parseLibraryForm(formData);
  if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? "Please check the item details.");

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const { error } = validateLibraryImage(imageFile);
    if (error) throw new ActionError(error);
  }

  const featuredOnHomepage = formData.get("featuredOnHomepage") === "on";
  const featured = await resolveLibraryFeaturedUpdate({
    item: {
      published: parsed.data.published,
      featuredOnHomepage: false,
      featuredAt: null,
    },
    requestFeatured: featuredOnHomepage,
  });

  if ("error" in featured) throw new ActionError(featured.error);

  const data = {
    ...parsed.data,
    ...featured,
  };

  await createWithUniqueSlug(
    parsed.data.title,
    async (slug) => Boolean(await withDbErrorHandling(() => prisma.libraryItem.findUnique({ where: { id: slug } }), "Database operation failed")),
    async (id) => {
      let imagePath: string | undefined;
      if (imageFile && imageFile.size > 0) {
        imagePath = await saveLibraryImage(id, imageFile);
      }
      try {
        return await withDbErrorHandling(() => prisma.libraryItem.create({ data: { id, ...data, ...(imagePath ? { imagePath } : {}) } }), "Database operation failed");
      } catch (error) {
        if (imagePath) await deleteLibraryImage(imagePath).catch(() => undefined);
        throw error;
      }
    },
  );

  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/admin/library");
  redirect("/admin/library?created=1");
  }, "/admin/library/new", "creating library item");
}

export async function updateLibraryItem(id: string, formData: FormData) {
  return executeServerAction(async () => {
  await requireAdmin();
  const parsed = parseLibraryForm(formData);
  if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? "Please check the item details.");

  const existing = await withDbErrorHandling(() => prisma.libraryItem.findUnique({ where: { id } }), "Database operation failed");
  if (!existing) throw new ActionError("Library item not found.");

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const { error } = validateLibraryImage(imageFile);
    if (error) throw new ActionError(error);
  }

  const featuredOnHomepage = formData.get("featuredOnHomepage") === "on";
  const featured = await resolveLibraryFeaturedUpdate({
    item: {
      published: parsed.data.published,
      featuredOnHomepage: existing.featuredOnHomepage,
      featuredAt: existing.featuredAt,
    },
    requestFeatured: featuredOnHomepage,
  });

  if ("error" in featured) throw new ActionError(featured.error);

  const removeImage = formData.get("removeImage") === "true";
  let imagePath: string | undefined | null;

  if (imageFile && imageFile.size > 0) {
    imagePath = await saveLibraryImage(id, imageFile);
  } else if (removeImage) {
    if (existing.imagePath) {
      await deleteLibraryImage(existing.imagePath);
    }
    imagePath = null;
  }

  await withDbErrorHandling(() => prisma.libraryItem.update({
      where: { id },
      data: {
        ...parsed.data,
        ...featured,
        ...(imagePath !== undefined ? { imagePath } : {}),
      },
    }), "Database operation failed");

  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/admin/library");
  revalidatePath(`/admin/library/${id}`);
  redirect("/admin/library?saved=1");
  }, `/admin/library/${id}/edit`, "updating library item");
}

export async function deleteLibraryItemById(id: string): Promise<{ error?: string }> {
  await requireAdmin();

  const existing = await withDbErrorHandling(() => prisma.libraryItem.findUnique({ where: { id } }), "Database operation failed");
  if (!existing) {
    return { error: "Library item not found." };
  }

  if (existing.imagePath) {
    await deleteLibraryImage(existing.imagePath);
  }

  await withDbErrorHandling(() => prisma.libraryItem.delete({ where: { id } }), "Database operation failed");

  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/admin/library");
  revalidatePath(`/admin/library/${id}`);

  return {};
}

export async function deleteLibraryItemAction(id: string, returnTo: "list" | "profile" = "list") {
  const result = await deleteLibraryItemById(id);
  if (result.error) {
    const errorUrl = returnTo === "profile" 
      ? `/admin/library/${id}?error=${encodeURIComponent(result.error)}`
      : withFlash(`/admin/library/${id}/edit`, { message: result.error });
    redirect(errorUrl);
  }
  redirect("/admin/library?deleted=1");
}
