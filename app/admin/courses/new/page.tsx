import Link from "next/link";
import { CourseForm } from "@/components/admin/CourseForm";
import { createCourse } from "@/app/admin/courses/actions";
import { getFeaturedHomepageCourseCount } from "@/services/courses";
import { getAllTeachers } from "@/services/teachers";
import { requireAdmin } from "@/services/auth-actions";
import { readFlash, type FlashParams } from "@/utils/flash";

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: Promise<FlashParams>;
}) {
  await requireAdmin();
  const [teachers, featuredCount, params] = await Promise.all([
    getAllTeachers(),
    getFeaturedHomepageCourseCount(),
    searchParams,
  ]);

  return (
    <div>
      <Link href="/admin/courses" className="text-sm text-primary hover:underline">
        ← Back to courses
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">Add course</h1>
      {readFlash(params) && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">{readFlash(params)}</p>
      )}
      {teachers.length === 0 ? (
        <p className="mt-4 rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-text">
          Add at least one teacher before creating a course.{" "}
          <Link href="/admin/teachers/new" className="font-medium text-primary hover:underline">
            Add teacher
          </Link>
        </p>
      ) : (
        <div className="mt-8">
          <CourseForm
            teachers={teachers}
            featuredCount={featuredCount}
            action={createCourse}
            submitLabel="Create course"
          />
        </div>
      )}
    </div>
  );
}
