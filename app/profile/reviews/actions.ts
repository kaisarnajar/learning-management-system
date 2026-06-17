"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-actions";
import { prisma } from "@/lib/prisma";
import {
  canStudentDeleteReview,
  canStudentEditReview,
  getStudentReviewForUser,
} from "@/lib/student-reviews";
import { studentReviewSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

function reviewsPath(suffix = "") {
  return `/profile/reviews${suffix}`;
}

function revalidateReviewPaths() {
  revalidatePath("/");
  revalidatePath("/profile/reviews");
  revalidatePath("/admin/review-approvals");
}

function parseReviewForm(formData: FormData) {
  return studentReviewSchema.safeParse({
    quote: formData.get("quote"),
    course: formData.get("course") ?? "",
    location: formData.get("location") ?? "",
    rating: formData.get("rating"),
  });
}

export async function createStudentReview(formData: FormData) {
  const session = await requireUser();
  const parsed = parseReviewForm(formData);

  if (!parsed.success) {
    redirect(
      reviewsPath(`?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`),
    );
  }

  await withDbErrorHandling(() => prisma.studentReview.create({
      data: {
        userId: session.user.id,
        quote: parsed.data.quote,
        course: parsed.data.course || null,
        location: parsed.data.location || null,
        rating: parsed.data.rating,
        status: "PENDING",
      },
    }), "Database operation failed");

  revalidateReviewPaths();
  redirect(reviewsPath("?submitted=1"));
}

export async function updateStudentReview(id: string, formData: FormData) {
  const session = await requireUser();
  const parsed = parseReviewForm(formData);

  if (!parsed.success) {
    redirect(
      reviewsPath(`?edit=${id}&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`),
    );
  }

  const existing = await getStudentReviewForUser(id, session.user.id);
  if (!existing) {
    redirect(reviewsPath("?error=notfound"));
  }

  if (!canStudentEditReview(existing, session.user.id)) {
    redirect(reviewsPath("?error=locked"));
  }

  await withDbErrorHandling(() => prisma.studentReview.update({
      where: { id },
      data: {
        quote: parsed.data.quote,
        course: parsed.data.course || null,
        location: parsed.data.location || null,
        rating: parsed.data.rating,
        status: "PENDING",
        featuredOnHomepage: false,
        featuredAt: null,
      },
    }), "Database operation failed");

  revalidateReviewPaths();
  redirect(reviewsPath("?resubmitted=1"));
}

export async function deleteStudentReview(id: string) {
  const session = await requireUser();

  const existing = await getStudentReviewForUser(id, session.user.id);
  if (!existing) {
    redirect(reviewsPath("?error=notfound"));
  }

  if (!canStudentDeleteReview(existing, session.user.id)) {
    redirect(reviewsPath("?error=notfound"));
  }

  await withDbErrorHandling(() => prisma.studentReview.delete({ where: { id } }), "Database operation failed");

  revalidateReviewPaths();
  redirect(reviewsPath("?deleted=1"));
}
