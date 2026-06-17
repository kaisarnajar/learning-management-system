import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminStudentReviewEditForm } from "@/components/admin/AdminStudentReviewEditForm";
import {
  HOMEPAGE_FEATURED_REVIEWS_MAX,
  getFeaturedHomepageReviewCount,
  getStudentReviewForAdmin,
} from "@/lib/student-reviews";

export default async function AdminReviewEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [review, featuredCount] = await Promise.all([
    getStudentReviewForAdmin(id),
    getFeaturedHomepageReviewCount(),
  ]);

  if (!review) notFound();
  if (review.status === "REJECTED") notFound();

  const canFeature = featuredCount < HOMEPAGE_FEATURED_REVIEWS_MAX;

  return (
    <div>
      <Link href={`/admin/review-approvals/${id}`} className="text-sm text-primary hover:underline">
        ← Back to review
      </Link>

      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">
        {review.status === "PENDING" ? "Review submission" : "Edit review settings"}
      </h1>
      <p className="mt-1 text-sm text-muted">{review.user.name ?? review.user.email}</p>

      {query.saved === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Changes saved.</p>
      )}

      <div className="mt-8">
        <AdminStudentReviewEditForm
          review={review}
          featuredCount={featuredCount}
          canFeature={canFeature}
        />
      </div>
    </div>
  );
}
