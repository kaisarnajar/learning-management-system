"use client";

import { deleteSiteAnnouncement } from "@/app/admin/announcements/actions";

export function DeleteSiteAnnouncementButton({ id, title }: { id: string; title: string }) {
  const handleClick = () => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) {
      return;
    }
    void deleteSiteAnnouncement(id);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm font-medium text-destructive-text hover:underline"
    >
      Delete
    </button>
  );
}
