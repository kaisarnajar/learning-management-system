"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { createAdminCrudActions } from "@/services/admin-crud";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/services/auth-actions";
import { formatInputDateValue } from "@/utils/form-date";
import { notifyAllStudentsOfSiteAnnouncement } from "@/services/notifications";
import { enforceHomepageAnnouncementLimit, resolveAnnouncementFeaturedUpdate, getSiteAnnouncementForAdmin } from "@/services/site-announcements";
import { siteAnnouncementSchema } from "@/utils/validations";
import {
  addImagesToAnnouncement,
  getRemoveAnnouncementImageIds,
  removeAnnouncementImages,
  createSiteAnnouncementRecord,
  updateSiteAnnouncementRecord,
  toggleSiteAnnouncementHomepageRecord,
  deleteSiteAnnouncementRecord
} from "@/services/site-announcement-mutations";
import { deleteAnnouncementImageFile } from "@/services/site-announcement-upload";
import { revalidatePublicContent } from "@/services/public-cache";

function adminListPath(query = "") {
  return `/admin/announcements${query}`;
}

function parseSiteAnnouncementForm(formData: FormData) {
  const published = formData.get("published") === "on";
  const showOnHomepage = formData.get("showOnHomepage") === "on";

  if (showOnHomepage && !published) {
    return {
      ok: false as const,
      message: "Only published announcements can appear on the homepage.",
    };
  }

  const eventDateInput = String(formData.get("eventDate") ?? "").trim();
  const eventDate = eventDateInput ? formatInputDateValue(eventDateInput) ?? "" : "";
  if (eventDateInput && !eventDate) {
    return {
      ok: false as const,
      message: "Enter a valid event date or leave the field blank.",
    };
  }

  const parsed = siteAnnouncementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    eventDate,
    location: formData.get("location") ?? "",
    showOnHomepage,
    published,
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  return { ok: true as const, data: parsed.data };
}

type SiteAnnouncementColumns = Parameters<typeof updateSiteAnnouncementRecord>[1];

const crud = createAdminCrudActions({
  label: "site announcement",
  unexpectedErrorMessage: "An unexpected database error occurred.",
  // Admins edit drafts too; the public getter only returns published rows.
  model: {
    find: getSiteAnnouncementForAdmin,
    remove: deleteSiteAnnouncementRecord,
  },
  parse: (formData) => {
    const parsed = parseSiteAnnouncementForm(formData);
    return parsed.ok ? { ok: true, data: parsed.data } : { ok: false, message: parsed.message };
  },
  paths: { list: adminListPath(), revalidate: revalidateSiteAnnouncementPaths },
  hooks: {
    toColumns: (data) => ({
      title: data.title,
      body: data.body,
      eventDate: data.eventDate || null,
      location: data.location || null,
      published: data.published,
    }),

    prepareCreate: async ({ session, data }) => {
      const featured = await resolveAnnouncementFeaturedUpdate({
        published: data.published,
        requestFeatured: data.showOnHomepage,
        currentlyFeatured: false,
      });
      if ("error" in featured) return { error: featured.error };
      return { columns: { showOnHomepage: featured.showOnHomepage, createdById: session.user.id } };
    },

    writeCreate: (_ctx, columns) =>
      createSiteAnnouncementRecord(columns as Parameters<typeof createSiteAnnouncementRecord>[0]),

    afterCreate: async ({ formData, data }, announcement) => {
      const imageResult = await addImagesToAnnouncement(announcement.id, formData, 0);
      if (imageResult.error) {
        await deleteSiteAnnouncementRecord(announcement.id);
        return { error: imageResult.error };
      }

      if (data.published) {
        await notifyAllStudentsOfSiteAnnouncement({
          announcementId: announcement.id,
          title: data.title,
          body: data.body,
        });
      }
    },

    prepareUpdate: async ({ id, existing, formData, data }) => {
      const removeIds = getRemoveAnnouncementImageIds(formData);
      await removeAnnouncementImages(removeIds, id);

      const remainingCount =
        existing.images.length - existing.images.filter((img) => removeIds.includes(img.id)).length;

      const imageResult = await addImagesToAnnouncement(id, formData, remainingCount);
      if (imageResult.error) return { error: imageResult.error };

      const featured = await resolveAnnouncementFeaturedUpdate({
        published: data.published,
        requestFeatured: data.showOnHomepage,
        currentlyFeatured: existing.showOnHomepage,
      });
      if ("error" in featured) return { error: featured.error };
      return { columns: { showOnHomepage: featured.showOnHomepage } };
    },

    writeUpdate: ({ id }, columns) => updateSiteAnnouncementRecord(id, columns as SiteAnnouncementColumns),

    afterUpdate: async ({ id, existing, data }) => {
      if (data.published && !existing.published) {
        await notifyAllStudentsOfSiteAnnouncement({
          announcementId: id,
          title: data.title,
          body: data.body,
        });
      }
    },

    beforeDelete: async (existing) => {
      for (const img of existing.images) {
        await deleteAnnouncementImageFile(img.imagePath);
      }
    },
  },
});

export async function createSiteAnnouncement(formData: FormData) {
  return crud.create(formData);
}

export async function updateSiteAnnouncement(id: string, formData: FormData) {
  return crud.update(id, formData);
}

export async function toggleSiteAnnouncementHomepage(id: string) {
  await requireAdmin();

  const existing = await getSiteAnnouncementForAdmin(id);
  if (!existing) {
    redirect(`${adminListPath()}?error=notfound`);
  }

  if (!existing.published) {
    redirect(
      `${adminListPath()}?error=${encodeURIComponent("Publish the announcement before featuring it on the homepage.")}`,
    );
  }

  const showOnHomepage = !existing.showOnHomepage;

  try {
    await toggleSiteAnnouncementHomepageRecord(id, showOnHomepage);

    if (showOnHomepage) {
      await enforceHomepageAnnouncementLimit();
    }
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("Database error toggling site announcement homepage:", error);
    redirect(`${adminListPath()}?error=${encodeURIComponent("An unexpected database error occurred.")}`);
  }

  revalidateSiteAnnouncementPaths();
  redirect(`${adminListPath()}?saved=1`);
}

export async function deleteSiteAnnouncement(id: string) {
  return crud.remove(id);
}

function revalidateSiteAnnouncementPaths() {
  revalidatePath("/");

  revalidatePublicContent();
  revalidatePath("/announcements");
  revalidatePath("/admin/announcements");
  revalidatePath("/profile/notifications");
  revalidatePath("/profile", "layout");
}
