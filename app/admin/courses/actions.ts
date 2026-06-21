"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { syncEnrollmentsWithCourseStatus } from "@/lib/completion";
import { resolveCourseFeaturedUpdate } from "@/lib/courses";
import { prisma } from "@/lib/prisma";
import { getDefaultFeesForLevel } from "@/lib/course-pricing";
import { uniqueSlug } from "@/lib/slug";
import { getCourseStartDateFromForm } from "@/lib/course-start-date";
import { courseSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

function parseCourseForm(formData: FormData) {
  const level = String(formData.get("level") ?? "Beginner");
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  const defaults = getDefaultFeesForLevel(level);
  const featuredOnHomepage = formData.get("featuredOnHomepage") === "on";

  const startDate = getCourseStartDateFromForm(formData);

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    startDate,
    duration: formData.get("duration"),
    level,
    category: formData.get("category"),
    enrollmentFeeInr: formData.get("enrollmentFeeInr") ?? defaults.registrationFeeInr,
    monthlyFeeInr: formData.get("monthlyFeeInr") ?? defaults.monthlyFeeInr,
    teacherId,
    status: formData.get("status"),
  });

  if (!parsed.success) return parsed;

  return {
    success: true as const,
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      startDate: parsed.data.startDate,
      duration: parsed.data.duration,
      level: parsed.data.level,
      category: parsed.data.category,
      priceInrPaise: Math.round(parsed.data.enrollmentFeeInr * 100),
      monthlyFeeInrPaise: Math.round(parsed.data.monthlyFeeInr * 100),
      teacherId: parsed.data.teacherId,
      status: parsed.data.status,
      featuredOnHomepage,
    },
  };
}

export async function createCourse(formData: FormData) {
  await requireAdmin();
  const parsed = parseCourseForm(formData);

  if (!parsed.success) {
    throw new Error("Invalid course data");
  }

  const { title, featuredOnHomepage, ...courseData } = parsed.data;

  const featured = await resolveCourseFeaturedUpdate({
    status: courseData.status,
    requestFeatured: featuredOnHomepage,
    currentlyFeatured: false,
    currentFeaturedAt: null,
  });

  if ("error" in featured) {
    redirect(`/admin/courses/new?saveError=${encodeURIComponent(featured.error)}`);
  }

  try {
    const id = await uniqueSlug(title, async (slug) => {
      const existing = await prisma.course.findUnique({ where: { id: slug } });
      return Boolean(existing);
    });

    await prisma.course.create({
      data: { id, title, ...courseData, ...featured },
    });
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("Database error creating course:", error);
    redirect("/admin/courses/new?saveError=" + encodeURIComponent("An unexpected database error occurred."));
  }

  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath("/admin/courses");
  redirect("/admin/courses?created=1");
}

export async function updateCourse(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = parseCourseForm(formData);

  if (!parsed.success) {
    throw new Error("Invalid course data");
  }

  let existing;
  try {
    existing = await prisma.course.findUnique({ where: { id } });
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("Database error fetching course:", error);
    redirect(`/admin/courses/${id}/edit?saveError=${encodeURIComponent("Database error.")}`);
  }
  if (!existing) {
    throw new Error("Course not found");
  }

  const { title, featuredOnHomepage, ...courseData } = parsed.data;

  const featured = await resolveCourseFeaturedUpdate({
    status: courseData.status,
    requestFeatured: featuredOnHomepage,
    currentlyFeatured: existing.featuredOnHomepage,
    currentFeaturedAt: existing.featuredAt,
  });

  if ("error" in featured) {
    redirect(`/admin/courses/${id}/edit?saveError=${encodeURIComponent(featured.error)}`);
  }

  try {
    await prisma.course.update({
      where: { id },
      data: { title, ...courseData, ...featured },
    });

    await syncEnrollmentsWithCourseStatus(id, courseData.status);
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("Database error updating course:", error);
    redirect(`/admin/courses/${id}/edit?saveError=${encodeURIComponent("An unexpected database error occurred.")}`);
  }

  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${id}/edit`);
  revalidatePath(`/admin/courses/${id}/students`);
  revalidatePath("/admin/enrollments");
  revalidatePath("/profile/courses");
  redirect(`/admin/courses?saved=1`);
}

export async function deleteCourse(id: string) {
  await requireAdmin();

  const course = await withDbErrorHandling(() => prisma.course.findUnique({
      where: { id },
      select: { title: true },
    }), "Database operation failed");

  if (!course) {
    redirect("/admin/courses?deleteError=Course%20not%20found.");
  }

  try {
    const activeStudentCount = await prisma.enrollment.count({
      where: { courseId: id, status: { in: ["active", "completed"] } },
    });

    if (activeStudentCount > 0) {
      redirect(
        `/admin/courses?deleteError=${encodeURIComponent(
          `This course can't be deleted because ${activeStudentCount} student${activeStudentCount === 1 ? "" : "s"} ${activeStudentCount === 1 ? "is" : "are"} enrolled.`,
        )}`,
      );
    }

    // Delete any inactive/pending/rejected enrollments to prevent orphans, since no DB-level FK exists
    await prisma.enrollment.deleteMany({
      where: { courseId: id },
    });

    await prisma.course.delete({ where: { id } });
  } catch (error) {
    // If the error is a NEXT_REDIRECT, rethrow it so Next.js handles the redirect.
    if (isRedirectError(error)) { throw error; }
    console.error("Database error deleting course:", error);
    redirect("/admin/courses?deleteError=" + encodeURIComponent("An unexpected database error occurred."));
  }

  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath("/admin/courses");
  redirect("/admin/courses?deleted=1");
}
