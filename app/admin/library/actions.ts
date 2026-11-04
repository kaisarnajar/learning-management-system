"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { createAdminCrudActions, parseFormWith } from "@/services/admin-crud";
import { resolveLibraryFeaturedUpdate } from "@/services/library";
import { deleteLibraryImage, saveLibraryImage, validateLibraryImage } from "@/services/library-upload";
import { prisma } from "@/utils/prisma";
import { createWithUniqueSlug } from "@/utils/slug";
import { libraryItemSchema } from "@/utils/validations";
import { withDbErrorHandling } from "@/utils/db-error";
import { ActionError } from "@/utils/action-utils";
import { withFlash } from "@/utils/flash";
import { isUploadError } from "@/services/storage";
import { revalidatePublicContent } from "@/services/public-cache";

const parseLibraryForm = parseFormWith(
  libraryItemSchema,
  (formData: FormData) => {
    const pdfUrl = formData.get("pdfUrl");
    return {
      title: formData.get("title"),
      author: formData.get("author"),
      topic: formData.get("topic"),
      level: formData.get("level"),
      language: formData.get("language"),
      pdfUrl: pdfUrl ? String(pdfUrl) : "",
      published: formData.get("published") === "on",
    };
  },
  "Please check the item details.",
);

function revalidateLibraryPaths(id?: string) {
  revalidatePath("/");

  revalidatePublicContent();
  revalidatePath("/library");
  revalidatePath("/admin/library");
  if (id) {
    revalidatePath(`/admin/library/${id}`);
  }
}

/** The cover image the form uploads, or null; invalid files stop the action with the validation message. */
function uploadedImage(formData: FormData) {
  const imageFile = formData.get("image") as File | null;
  if (!imageFile || imageFile.size === 0) return null;
  const { error } = validateLibraryImage(imageFile);
  return error ? { error } : { file: imageFile };
}

async function saveImage(id: string, file: File) {
  try {
    return await saveLibraryImage(id, file);
  } catch (error) {
    if (isUploadError(error)) throw new ActionError(error.message);
    throw error;
  }
}

const crud = createAdminCrudActions({
  label: "library item",
  errorStyle: "flash",
  notFoundMessage: "Library item not found.",
  flags: { created: "created" },
  model: {
    find: (id) => prisma.libraryItem.findUnique({ where: { id } }),
    update: (id, data) => prisma.libraryItem.update({ where: { id }, data: data as Prisma.LibraryItemUncheckedUpdateInput }),
    remove: (id) => prisma.libraryItem.delete({ where: { id } }),
  },
  parse: parseLibraryForm,
  paths: {
    list: "/admin/library",
    revalidate: (id, operation) => revalidateLibraryPaths(operation === "create" ? undefined : id),
  },
  hooks: {
    prepareCreate: async ({ formData, data }) => {
      const image = uploadedImage(formData);
      if (image && "error" in image) return { error: image.error };

      const featured = await resolveLibraryFeaturedUpdate({
        item: { published: data.published, featuredOnHomepage: false, featuredAt: null },
        requestFeatured: formData.get("featuredOnHomepage") === "on",
      });
      if ("error" in featured) return { error: featured.error };

      return { columns: featured };
    },

    // The image is stored under the item id, so it is uploaded once the slug is known and
    // removed again if the row cannot be created.
    writeCreate: async ({ formData, data }, columns) => {
      const image = uploadedImage(formData);
      const imageFile = image && "file" in image ? image.file : null;
      return createWithUniqueSlug(
        data.title,
        async (slug) => Boolean(await withDbErrorHandling(() => prisma.libraryItem.findUnique({ where: { id: slug } }), "Database operation failed")),
        async (id) => {
          const imagePath = imageFile ? await saveImage(id, imageFile) : undefined;
          try {
            return await withDbErrorHandling(
              () => prisma.libraryItem.create({
                data: { id, ...columns, ...(imagePath ? { imagePath } : {}) } as Prisma.LibraryItemUncheckedCreateInput,
              }),
              "Database operation failed",
            );
          } catch (error) {
            if (imagePath) await deleteLibraryImage(imagePath).catch(() => undefined);
            throw error;
          }
        },
      );
    },

    prepareUpdate: async ({ id, existing, formData, data }) => {
      const image = uploadedImage(formData);
      if (image && "error" in image) return { error: image.error };

      const featured = await resolveLibraryFeaturedUpdate({
        item: {
          published: data.published,
          featuredOnHomepage: existing.featuredOnHomepage,
          featuredAt: existing.featuredAt,
        },
        requestFeatured: formData.get("featuredOnHomepage") === "on",
      });
      if ("error" in featured) return { error: featured.error };

      // The new cover is stored before the row is touched; the old one goes after the row commits.
      let imagePath: string | undefined | null;
      if (image && "file" in image) {
        imagePath = await saveImage(id, image.file);
      } else if (formData.get("removeImage") === "true") {
        imagePath = null;
      }

      return { columns: { ...featured, ...(imagePath !== undefined ? { imagePath } : {}) } };
    },

    writeUpdate: async ({ id }, columns) => {
      try {
        await withDbErrorHandling(
          () => prisma.libraryItem.update({ where: { id }, data: columns as Prisma.LibraryItemUncheckedUpdateInput }),
          "Database operation failed",
        );
      } catch (error) {
        if (columns.imagePath) await deleteLibraryImage(columns.imagePath as string);
        throw error;
      }
    },

    // The row no longer references the old cover: remove it now.
    afterUpdate: async ({ existing }, columns) => {
      const imagePath = columns.imagePath as string | null | undefined;
      if (imagePath !== undefined && existing.imagePath && existing.imagePath !== imagePath) {
        await deleteLibraryImage(existing.imagePath);
      }
    },

    beforeDelete: async (existing) => {
      if (existing.imagePath) {
        await deleteLibraryImage(existing.imagePath);
      }
    },
  },
});

export async function createLibraryItem(formData: FormData) {
  return crud.create(formData);
}

export async function updateLibraryItem(id: string, formData: FormData) {
  return crud.update(id, formData);
}

export async function deleteLibraryItemById(id: string): Promise<{ error?: string }> {
  return crud.removeById(id);
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
