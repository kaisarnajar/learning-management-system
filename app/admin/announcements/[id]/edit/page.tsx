import Link from "next/link";
import { notFound } from "next/navigation";
import { updateSiteAnnouncement } from "@/app/admin/announcements/actions";
import { SiteAnnouncementForm } from "@/components/admin/SiteAnnouncementForm";
import {
  getFeaturedHomepageAnnouncementCount,
  getSiteAnnouncementForAdmin,
} from "@/services/site-announcements";

export default async function EditSiteAnnouncementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const [announcement, featuredCount] = await Promise.all([
    getSiteAnnouncementForAdmin(id),
    getFeaturedHomepageAnnouncementCount(),
  ]);

  if (!announcement) notFound();

  const action = updateSiteAnnouncement.bind(null, id);

  return (
    <div>
      <Link href="/admin/announcements" className="text-sm text-primary hover:underline">
        ← Back to announcements
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">Edit announcement</h1>
      <div className="mt-8">
        <SiteAnnouncementForm
          action={action}
          submitLabel="Save changes"
          announcement={announcement}
          featuredCount={featuredCount}
          error={error ? decodeURIComponent(error) : undefined}
        />
      </div>
    </div>
  );
}
