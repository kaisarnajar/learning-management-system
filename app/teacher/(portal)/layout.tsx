import type { Metadata } from "next";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { requireTeacher } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Teacher Portal",
  robots: { index: false, follow: false },
};

export default async function TeacherPortalLayout({ children }: { children: React.ReactNode }) {
  const { teacher } = await requireTeacher();

  return (
    <div className="min-h-[calc(100vh-4rem)] md:flex">
      <TeacherSidebar teacherName={teacher.name} />
      <main className="flex-1 min-w-0 bg-background/40 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
