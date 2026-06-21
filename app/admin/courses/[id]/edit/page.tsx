import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseForm } from "@/components/admin/CourseForm";
import { updateCourse } from "@/app/admin/courses/actions";
import { getCourseById, getFeaturedHomepageCourseCount } from "@/lib/courses";
import { getAllTeachers } from "@/lib/teachers";
import { ActionToast } from "@/components/shared/ToastProvider";


export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; created?: string; saveError?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [course, teachers, featuredCount] = await Promise.all([
    getCourseById(id),
    getAllTeachers(),
    getFeaturedHomepageCourseCount(),
  ]);

  if (!course) notFound();

  const boundUpdate = updateCourse.bind(null, id);

  return (
    <div>
      <Link href="/admin/courses" className="text-sm text-primary hover:underline">
        ← Back to courses
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">Edit course</h1>

      <ActionToast trigger={query.saved === "1"} paramName="saved" message="Changes saved." variant="info" />
      <ActionToast trigger={query.created === "1"} paramName="created" message="Course created." variant="info" />

      {query.saveError && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">{query.saveError}</p>
      )}

      <div className="mt-8">
        <CourseForm
          course={course}
          teachers={teachers}
          featuredCount={featuredCount}
          action={boundUpdate}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
