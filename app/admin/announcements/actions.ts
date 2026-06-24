"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { formatInputDateValue } from "@/lib/form-date";
import { prisma } from "@/lib/prisma";
import { notifyAllStudentsOfSiteAnnouncement } from "@/lib/notifications";
import { enforceHomepageAnnouncementLimit, resolveAnnouncementFeaturedUpdate } from "@/lib/site-announcements";
import { siteAnnouncementSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";
import {
  addImagesToAnnouncement,
  getRemoveAnnouncementImageIds,
  removeAnnouncementImages,
} from "@/lib/site-announcement-mutations";
import { deleteAnnouncementImageFile } from "@/lib/site-announcement-upload";

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

export async function createSiteAnnouncement(formData: FormData) {
  const session = await requireAdmin();
  const parsed = parseSiteAnnouncementForm(formData);

  if (!parsed.ok) {
    redirect(`${adminListPath("/new")}?error=${encodeURIComponent(parsed.message)}`);
  }

  const featured = await resolveAnnouncementFeaturedUpdate({
    published: parsed.data.published,
    requestFeatured: parsed.data.showOnHomepage,
    currentlyFeatured: false,
  });

  if ("error" in featured) {
    redirect(`${adminListPath("/new")}?error=${encodeURIComponent(featured.error)}`);
  }

  try {
    const announcement = await prisma.siteAnnouncement.create({
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        eventDate: parsed.data.eventDate || null,
        location: parsed.data.location || null,
        showOnHomepage: featured.showOnHomepage,
        published: parsed.data.published,
        createdById: session.user.id,
      },
    });

    const imageResult = await addImagesToAnnouncement(announcement.id, formData, 0);
    if (imageResult.error) {
      await prisma.siteAnnouncement.delete({ where: { id: announcement.id } });
      redirect(`${adminListPath("/new")}?error=${encodeURIComponent(imageResult.error)}`);
    }

    if (parsed.data.published) {
      await notifyAllStudentsOfSiteAnnouncement({
        announcementId: announcement.id,
        title: announcement.title,
        body: announcement.body,
      });
    }
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("Database error creating site announcement:", error);
    redirect(`${adminListPath("/new")}?error=${encodeURIComponent("An unexpected database error occurred.")}`);
  }

  revalidateSiteAnnouncementPaths();
  redirect(`${adminListPath()}?posted=1`);
}

export async function updateSiteAnnouncement(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = parseSiteAnnouncementForm(formData);

  if (!parsed.ok) {
    redirect(`${adminListPath(`/${id}/edit`)}?error=${encodeURIComponent(parsed.message)}`);
  }

  let existing;
  try {
    existing = await prisma.siteAnnouncement.findUnique({
      where: { id },
      include: { images: true },
    });
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("Database error fetching site announcement:", error);
    redirect(`${adminListPath(`/${id}/edit`)}?error=${encodeURIComponent("Database error.")}`);
  }
  if (!existing) {
    redirect(`${adminListPath()}?error=notfound`);
  }

  const removeIds = getRemoveAnnouncementImageIds(formData);
  await removeAnnouncementImages(removeIds, id);

  const remainingCount =
    existing.images.length - existing.images.filter((img) => removeIds.includes(img.id)).length;

  const imageResult = await addImagesToAnnouncement(id, formData, remainingCount);
  if (imageResult.error) {
    redirect(`${adminListPath(`/${id}/edit`)}?error=${encodeURIComponent(imageResult.error)}`);
  }

  const featured = await resolveAnnouncementFeaturedUpdate({
    published: parsed.data.published,
    requestFeatured: parsed.data.showOnHomepage,
    currentlyFeatured: existing.showOnHomepage,
  });

  if ("error" in featured) {
    redirect(`${adminListPath(`/${id}/edit`)}?error=${encodeURIComponent(featured.error)}`);
  }

  try {
    await prisma.siteAnnouncement.update({
      where: { id },
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        eventDate: parsed.data.eventDate || null,
        location: parsed.data.location || null,
        showOnHomepage: featured.showOnHomepage,
        published: parsed.data.published,
      },
    });

    if (parsed.data.published && !existing.published) {
      await notifyAllStudentsOfSiteAnnouncement({
        announcementId: id,
        title: parsed.data.title,
        body: parsed.data.body,
      });
    }
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("Database error updating site announcement:", error);
    redirect(`${adminListPath(`/${id}/edit`)}?error=${encodeURIComponent("An unexpected database error occurred.")}`);
  }

  revalidateSiteAnnouncementPaths();
  redirect(`${adminListPath()}?saved=1`);
}

export async function toggleSiteAnnouncementHomepage(id: string) {
  await requireAdmin();

  const existing = await withDbErrorHandling(() => prisma.siteAnnouncement.findUnique({ where: { id } }), "Database operation failed");
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
    await prisma.siteAnnouncement.update({
      where: { id },
      data: { showOnHomepage },
    });

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
  await requireAdmin();

  const existing = await withDbErrorHandling(
    () => prisma.siteAnnouncement.findUnique({ where: { id }, include: { images: true } }),
    "Database operation failed"
  );
  if (!existing) {
    redirect(`${adminListPath()}?error=notfound`);
  }

  try {
    for (const img of existing.images) {
      await deleteAnnouncementImageFile(img.imagePath);
    }
    await prisma.siteAnnouncement.delete({ where: { id } });
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("Database error deleting site announcement:", error);
    redirect(`${adminListPath()}?error=${encodeURIComponent("An unexpected database error occurred.")}`);
  }

  revalidateSiteAnnouncementPaths();
  redirect(`${adminListPath()}?deleted=1`);
}

function revalidateSiteAnnouncementPaths() {
  revalidatePath("/");
  revalidatePath("/announcements");
  revalidatePath("/admin/announcements");
  revalidatePath("/profile/notifications");
  revalidatePath("/profile", "layout");
}
