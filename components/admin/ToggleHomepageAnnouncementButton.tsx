"use client";

import { useFormStatus } from "react-dom";
import { toggleSiteAnnouncementHomepage } from "@/app/admin/announcements/actions";

type ToggleHomepageAnnouncementButtonProps = {
  id: string;
  showOnHomepage: boolean;
  published: boolean;
};

function SubmitLabel({ showOnHomepage }: { showOnHomepage: boolean }) {
  const { pending } = useFormStatus();
  if (pending) return "Updating…";
  return showOnHomepage ? "On homepage" : "Add to homepage";
}

export function ToggleHomepageAnnouncementButton({
  id,
  showOnHomepage,
  published,
}: ToggleHomepageAnnouncementButtonProps) {
  if (!published) {
    return <span className="text-xs text-muted">Publish first</span>;
  }

  return (
    <form action={toggleSiteAnnouncementHomepage.bind(null, id)}>
      <button
        type="submit"
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
          showOnHomepage
            ? "bg-info-bg text-info-text hover:bg-violet-200"
            : "bg-surface-muted text-muted hover:bg-surface-muted-hover"
        }`}
        title={showOnHomepage ? "Remove from homepage" : "Feature on homepage"}
      >
        <SubmitLabel showOnHomepage={showOnHomepage} />
      </button>
    </form>
  );
}
