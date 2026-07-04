import Link from "next/link";
import { SplitSectionTitle } from "@/components/site/SplitSectionTitle";
import { CoursePricingDisplay } from "@/components/courses/CoursePricingDisplay";
import { CourseDurationDisplay } from "@/components/courses/CourseDurationDisplay";
import { CourseTeacherInfo } from "@/components/courses/CourseTeacherInfo";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import type { CourseWithTeacher } from "@/lib/courses";

type FeaturedCoursesProps = {
  courses: CourseWithTeacher[];
};

export function FeaturedCourses({ courses }: FeaturedCoursesProps) {
  return (
    <section className="bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <div className="text-center sm:text-left">
            <SplitSectionTitle muted="Our" accent="Courses" />
            <p className="mt-3 max-w-xl text-sm text-muted sm:text-base">
              Explore our core curriculum designed for deep understanding and spiritual growth.
            </p>
          </div>
          <Link href="/courses" className="btn-gold-solid inline-flex px-8 py-3 text-sm">
            View all
          </Link>
        </div>
        <ul className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const detailHref = `/courses/${course.id}`;
            return (
              <li key={course.id} className="card-elevated overflow-hidden p-0">
                <Link
                  href={detailHref}
                  className="block"
                >
                  <CourseThumbnail category={course.category} size="lg" />
                </Link>
                <div className="p-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gold">
                    {course.category}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-foreground">
                    <Link href={detailHref} className="hover:text-gold">
                      {course.title}
                    </Link>
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{course.description}</p>
                  <CourseTeacherInfo teacher={course.teacher} compact />
                  <CourseDurationDisplay duration={course.duration} className="mt-2" />
                  <CoursePricingDisplay course={course} className="mt-2" compact />
                  <Link
                    href={detailHref}
                    className="btn-gold-outline mt-4 inline-flex w-full items-center justify-center py-2.5 text-xs"
                  >
                    Course Details
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
        {courses.length === 0 && (
          <p className="mt-8 text-center text-muted">New courses will be announced soon.</p>
        )}

      </div>
    </section>
  );
}
