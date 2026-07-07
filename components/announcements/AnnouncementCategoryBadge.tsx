import type { AnnouncementCategory } from "@prisma/client";
import { announcementCategoryLabels, announcementCategoryStyles } from "@/services/announcements";

export function AnnouncementCategoryBadge({ category }: { category: AnnouncementCategory }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${announcementCategoryStyles[category]}`}
    >
      {announcementCategoryLabels[category]}
    </span>
  );
}
