"use client";

import { deleteSiteAnnouncement } from "@/app/admin/announcements/actions";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

export function DeleteSiteAnnouncementButton({ id, title }: { id: string; title: string }) {
  return (
    <DeleteActionButton
      action={deleteSiteAnnouncement.bind(null, id)}
      itemName={title}
      className="text-sm font-medium text-destructive-text hover:underline"
    />
  );
}
