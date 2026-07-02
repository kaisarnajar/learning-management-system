"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <nav
      className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4"
      aria-label="Course sections"
    >
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-white"
                : "border border-border text-foreground hover:bg-accent-muted/50"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
