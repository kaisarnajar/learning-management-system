"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/services/auth-actions";
import { syncEnrollmentsWithCourseStatus } from "@/services/completion";
import { resolveCourseFeaturedUpdate } from "@/services/courses";
import { prisma } from "@/utils/prisma";
import { getDefaultFeesForLevel } from "@/services/course-pricing";
import { uniqueSlug } from "@/utils/slug";
import { getCourseStartDateFromForm } from "@/services/course-start-date";
import { courseSchema } from "@/utils/validations";
import { withDbErrorHandling } from "@/utils/db-error";

import { executeServerAction } from "@/utils/action-utils";

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
    feeFrequency: formData.get("feeFrequency") ?? "MONTHLY",
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
      feeFrequency: (parsed.data.feeFrequency ?? "MONTHLY") as import("@prisma/client").FeeFrequency,
      teacherId: parsed.data.teacherId,
      status: parsed.data.status,
      featuredOnHomepage,
    },
  };
}

export async function createCourse(formData: FormData) {
  return executeServerAction(async () => {
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
      throw new Error(featured.error);
    }

    const id = await uniqueSlug(title, async (slug) => {
      const existing = await prisma.course.findUnique({ where: { id: slug } });
      return Boolean(existing);
    });

    await prisma.course.create({
      data: { id, title, ...courseData, ...featured },
    });

    revalidatePath("/");
    revalidatePath("/courses");
    revalidatePath("/admin/courses");
    redirect("/admin/courses?created=1");
  }, "/admin/courses/new", "creating course");
}

export async function updateCourse(id: string, formData: FormData) {
  return executeServerAction(async () => {
    await requireAdmin();
    const parsed = parseCourseForm(formData);

    if (!parsed.success) {
      throw new Error("Invalid course data");
    }

    const existing = await prisma.course.findUnique({ where: { id } });
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
      throw new Error(featured.error);
    }

    await prisma.course.update({
      where: { id },
      data: { title, ...courseData, ...featured },
    });

    await syncEnrollmentsWithCourseStatus(id, courseData.status);

    revalidatePath("/");
    revalidatePath("/courses");
    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${id}/edit`);
    revalidatePath(`/admin/courses/${id}/students`);
    revalidatePath("/admin/enrollments");
    revalidatePath("/profile/courses");
    redirect(`/admin/courses?saved=1`);
  }, `/admin/courses/${id}/edit`, "updating course");
}

export async function deleteCourse(id: string) {
  return executeServerAction(async () => {
    await requireAdmin();

    const course = await withDbErrorHandling(() => prisma.course.findUnique({
        where: { id },
        select: { title: true },
      }), "Database operation failed");

    if (!course) {
      throw new Error("Course not found.");
    }

    const activeStudentCount = await prisma.enrollment.count({
      where: { courseId: id, status: { in: ["active", "completed"] } },
    });

    if (activeStudentCount > 0) {
      throw new Error(`This course can't be deleted because ${activeStudentCount} student${activeStudentCount === 1 ? "" : "s"} ${activeStudentCount === 1 ? "is" : "are"} enrolled.`);
    }

    // Delete any inactive/pending/rejected enrollments to prevent orphans, since no DB-level FK exists
    await prisma.enrollment.deleteMany({
      where: { courseId: id },
    });

    await prisma.course.delete({ where: { id } });

    revalidatePath("/");
    revalidatePath("/courses");
    revalidatePath("/admin/courses");
    redirect("/admin/courses?deleted=1");
  }, "/admin/courses", "deleting course", "deleteError");
}

