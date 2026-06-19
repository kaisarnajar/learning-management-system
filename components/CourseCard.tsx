import { TrackedLink } from "@/components/analytics/TrackedLink";
import { CourseEnrollButton } from "@/components/auth/CourseEnrollButton";
import { CoursePricingDisplay } from "@/components/courses/CoursePricingDisplay";
import { CourseDurationDisplay } from "@/components/courses/CourseDurationDisplay";
import { CourseTeacherInfo } from "@/components/courses/CourseTeacherInfo";
import { CourseStatusBadge } from "@/components/courses/CourseStatusBadge";
import { CourseCategoryIcon } from "@/components/courses/CourseCategoryIcon";
import { getCourseBannerClass, getCourseLevelClass } from "@/lib/course-display";
import type { CourseWithTeacher } from "@/lib/courses";

type CourseCardProps = {
  course: CourseWithTeacher;
  isEnrolled?: boolean;
  enrollmentStatus?: string | null;
  enrollmentId?: string | null;
  profileComplete?: boolean;
  hasPendingEnrollmentPayment?: boolean;
};

export function CourseCard({
  course,
  isEnrolled = false,
  enrollmentStatus = null,
  enrollmentId = null,
  profileComplete = true,
  hasPendingEnrollmentPayment = false,
}: CourseCardProps) {
  const levelClass = getCourseLevelClass(course.level);
  const detailHref = `/courses/${course.id}`;

  return (
    <article className="card-elevated flex flex-col overflow-hidden p-0 transition-transform hover:-translate-y-0.5">
      <TrackedLink
        href={detailHref}
        eventName="View Course"
        pageName="/courses"
        className={`flex h-32 items-center justify-center bg-gradient-to-br ${getCourseBannerClass(course.category)} text-white`}
      >
        <CourseCategoryIcon category={course.category} size="md" />
      </TrackedLink>
      <div className="flex flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gold">
            {course.category}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${levelClass}`}>
            {course.level}
          </span>
          <CourseStatusBadge status={course.status} />
        </div>
        <h3 className="text-lg font-bold text-foreground">
          <TrackedLink href={detailHref} eventName="View Course" pageName="/courses" className="hover:text-gold">
            {course.title}
          </TrackedLink>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{course.description}</p>
        <CourseTeacherInfo teacher={course.teacher} />
        <p className="mt-4 text-sm text-muted">Starts: {course.startDate}</p>
        <CourseDurationDisplay duration={course.duration} className="mt-1" />
        <CoursePricingDisplay course={course} className="mt-2" />
        <TrackedLink
          href={detailHref}
          eventName="View Course"
          pageName="/courses"
          className="btn-gold-outline mt-4 inline-flex w-full items-center justify-center py-2.5 text-xs"
        >
          Course Details
        </TrackedLink>
        <CourseEnrollButton
          courseId={course.id}
          courseStatus={course.status}
          isEnrolled={isEnrolled}
          enrollmentStatus={enrollmentStatus}
          enrollmentId={enrollmentId}
          profileComplete={profileComplete}
          hasPendingEnrollmentPayment={hasPendingEnrollmentPayment}
        />
      </div>
    </article>
  );
}
