import type { ComponentProps } from "react";
import Link from "next/link";
import { AnnouncementForm } from "@/components/teacher/AnnouncementForm";

type AnnouncementFormPageProps = ComponentProps<typeof AnnouncementForm> & {
  backHref: string;
  backLabel: string;
  heading: string;
  description?: string;
};

/** Shared body of the new/edit announcement pages (admin and teacher, course-wide and per student). */
export function AnnouncementFormPage({
  backHref,
  backLabel,
  heading,
  description,
  ...formProps
}: AnnouncementFormPageProps) {
  return (
    <div>
      <Link href={backHref} className="text-sm font-medium text-primary hover:underline">
        {backLabel}
      </Link>
      <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">{heading}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-6">
        <AnnouncementForm {...formProps} />
      </div>
    </div>
  );
}
