import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseEnrollButton } from "@/components/auth/CourseEnrollButton";
import { CoursePricingDisplay } from "@/components/courses/CoursePricingDisplay";
import { CourseDurationDisplay } from "@/components/courses/CourseDurationDisplay";
import { CourseTeacherInfo } from "@/components/courses/CourseTeacherInfo";
import { Section } from "@/components/site/Section";
import { auth } from "@/lib/auth";
import { CourseStatusBadge } from "@/components/courses/CourseStatusBadge";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { CourseShareButton } from "@/components/courses/CourseShareButton";
import { getCourseLevelClass } from "@/lib/course-display";
import { getPublicCourseById } from "@/lib/courses";
import { getUserCourseEnrollmentMap } from "@/lib/enrollments";
import { hasPendingEnrollmentFeeSubmission } from "@/lib/monthly-payments";
import { isUserProfileComplete } from "@/lib/profile";

type CoursePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { id } = await params;
  const course = await getPublicCourseById(id);
  if (!course) return { title: "Course not found" };
  return {
    title: course.title,
    description: course.description.slice(0, 160),
  };
}

export default async function CourseDetailPage({ params }: CoursePageProps) {
  const { id } = await params;
  const course = await getPublicCourseById(id);
  if (!course) notFound();

  const session = await auth();
  const enrollmentMap = session?.user?.id
    ? await getUserCourseEnrollmentMap(session.user.id)
    : new Map();
  const enrollment = enrollmentMap.get(course.id);
  const profileComplete = session?.user?.id
    ? await isUserProfileComplete(session.user.id)
    : true;
  const hasPendingEnrollmentPayment =
    session?.user?.id && enrollment
      ? await hasPendingEnrollmentFeeSubmission(session.user.id, course.id)
      : false;
  const levelClass = getCourseLevelClass(course.level);

  return (
    <Section>
      <Link href="/courses" className="text-sm font-medium text-gold hover:underline">
        ← All courses
      </Link>

      <article className="mx-auto mt-6 max-w-2xl">
        <CourseThumbnail category={course.category} size="lg" className="rounded-lg" />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gold">
              {course.category}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${levelClass}`}>
              {course.level}
            </span>
            <CourseStatusBadge status={course.status} />
          </div>
          <CourseShareButton courseTitle={course.title} />
        </div>

        <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">{course.title}</h1>
        <p className="mt-2 text-sm text-muted">Starts: {course.startDate}</p>
        <CourseDurationDisplay duration={course.duration} className="mt-1" />

        <p className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-muted">{course.description}</p>

        <CourseTeacherInfo teacher={course.teacher} />

        <div className="mt-6 rounded-lg border border-border bg-background/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">Fees</p>
          <CoursePricingDisplay course={course} className="mt-2" />
          <p className="mt-3 text-xs text-muted">
            Fees are set by the academy for each course. Paid courses require an enrollment fee before
            access is granted; monthly fees are paid from your profile after enrollment is active.
          </p>
        </div>

        <div className="mt-8">
          <CourseEnrollButton
            courseId={course.id}
            courseStatus={course.status}
            isEnrolled={enrollment?.status === "active" || enrollment?.status === "completed"}
            enrollmentStatus={enrollment?.status ?? null}
            enrollmentId={enrollment?.id ?? null}
            profileComplete={profileComplete}
            hasPendingEnrollmentPayment={hasPendingEnrollmentPayment}
          />
        </div>
      </article>
    </Section>
  );
}
