"use client";

import { usePathname } from "next/navigation";
import { TabPills } from "@/components/shared/TabPills";

type AdminCourseNavProps = {
  courseId: string;
};

export function AdminCourseNav({ courseId }: AdminCourseNavProps) {
  const pathname = usePathname();
  const base = `/admin/courses/${courseId}`;

  const links = [
    { href: `${base}/students`, label: "Students", exact: false },
    { href: `${base}/attendance`, label: "Attendance", exact: false },
    { href: `${base}/grades`, label: "Grade Cards", exact: false },
    { href: `${base}/announcements`, label: "Announcements", exact: false },
  ];

  return (
    <TabPills
      className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4"
      ariaLabel="Course sections"
      transition
      items={links.map((link) => ({
        href: link.href,
        label: link.label,
        active: pathname === link.href || pathname.startsWith(`${link.href}/`),
      }))}
    />
  );
}
