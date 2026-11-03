"use client";

import { usePathname } from "next/navigation";
import { TabPills } from "@/components/shared/TabPills";

type TeacherCourseNavProps = {
  courseId: string;
};

export function TeacherCourseNav({ courseId }: TeacherCourseNavProps) {
  const pathname = usePathname();
  const base = `/teacher/courses/${courseId}`;

  const links = [
    { href: base, label: "Students", exact: true },
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
        active: link.exact ? pathname === link.href : pathname.startsWith(link.href),
      }))}
    />
  );
}
