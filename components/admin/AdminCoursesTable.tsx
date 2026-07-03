import Link from "next/link";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteCourse } from "@/app/admin/courses/actions";
import { CourseStatusBadge } from "@/components/courses/CourseStatusBadge";
import { getCoursePricingFromCourse } from "@/lib/course-pricing";
import { getFeeFrequencyLabel } from "@/lib/fee-frequency";
import type { CourseWithTeacher } from "@/lib/courses";

export function AdminCoursesTable({
  courses,
  enrollmentCounts,
}: {
  courses: CourseWithTeacher[];
  enrollmentCounts: Map<string, number>;
}) {
  return (
    <table className="w-full min-w-[840px] text-left text-sm">
      <thead className="border-b border-border bg-background/50 text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Title</th>
          <th className="px-4 py-3 font-medium">Category</th>
          <th className="px-4 py-3 font-medium">Instructor</th>
          <th className="px-4 py-3 font-medium">Duration</th>
          <th className="px-4 py-3 font-medium">Registration fee</th>
          <th className="px-4 py-3 font-medium">Course fee</th>
          <th className="px-4 py-3 font-medium">Students</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium">Homepage</th>
          <th className="w-[1%] whitespace-nowrap px-4 py-3 font-medium" />
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {courses.map((course) => {
          const studentCount = enrollmentCounts.get(course.id) ?? 0;
          const fees = getCoursePricingFromCourse(course);
          return (
            <tr key={course.id}>
              <td className="px-4 py-3 font-medium text-foreground">{course.title}</td>
              <td className="px-4 py-3 text-muted">{course.category}</td>
              <td className="px-4 py-3 text-muted">
                {course.teacher?.name ?? "—"}
              </td>
              <td className="px-4 py-3 text-muted">{course.duration || "—"}</td>
              <td className="px-4 py-3 text-muted">₹{fees.registrationFeeInr}</td>
              <td className="px-4 py-3 text-muted">
                ₹{fees.monthlyFeeInr}{" "}
                <span className="text-xs text-muted/70">{getFeeFrequencyLabel(course.feeFrequency)}</span>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/courses/${course.id}/students`}
                  className="font-medium text-primary hover:underline"
                >
                  {studentCount}
                </Link>
              </td>
              <td className="px-4 py-3">
                <CourseStatusBadge status={course.status} />
              </td>
              <td className="px-4 py-3 text-muted">
                {course.featuredOnHomepage && course.status !== "DRAFT" ? "Featured" : "Not featured"}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/courses/${course.id}/students`}
                    className="font-medium text-primary hover:underline"
                  >
                    View
                  </Link>
                  <Link href={`/admin/courses/${course.id}/edit`} className="font-medium text-primary hover:underline">
                    Edit
                  </Link>
                  <DeleteActionButton action={deleteCourse.bind(null, course.id)} itemName={course.title} warningMessage={studentCount > 0 ? `This course can't be deleted because ${studentCount} student${studentCount === 1 ? "" : "s"} ${studentCount === 1 ? "is" : "are"} enrolled.` : undefined} className="text-sm font-medium text-destructive-text hover:underline" />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
