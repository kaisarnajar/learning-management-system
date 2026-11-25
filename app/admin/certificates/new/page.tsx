import { requireAdmin } from "@/services/auth-actions";
import { getCoursesAwaitingCertificates, getEnrollmentsAwaitingCertificatePaginated } from "@/services/certificates-admin";
import { GenerateCertificateForm } from "@/components/admin/certificates/GenerateCertificateForm";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import Link from "next/link";

const PAGE_SIZE = 50;

export default async function AdminGenerateCertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; q?: string; page?: string }>;
}) {
  await requireAdmin();
  const { courseId, q, page } = await searchParams;
  const safePage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  // Courses with an active or completed enrollment awaiting a certificate;
  // the students of the chosen course are listed a page at a time.
  const courses = await getCoursesAwaitingCertificates();
  const selectedCourseId = courseId && courses.some((c) => c.id === courseId) ? courseId : "";
  const candidates = selectedCourseId
    ? await getEnrollmentsAwaitingCertificatePaginated(safePage, PAGE_SIZE, { courseId: selectedCourseId, searchQuery: q })
    : { items: [], totalCount: 0 };

  return (
    <div className="space-y-6">
      <Link
        href="/admin/certificates"
        className="text-sm text-primary hover:underline mb-4 inline-block"
      >
        ← Back to Certificates
      </Link>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground">Generate New Certificate</h1>
        <p className="mt-1 text-sm text-muted mb-6">
          Issue a certificate of completion (completed enrollments) or appreciation (active or completed enrollments).
        </p>
        {selectedCourseId && (
          <div className="mb-4">
            <ListSearchForm
              action="/admin/certificates/new"
              query={q}
              totalCount={candidates.totalCount}
              preserveParams={{ courseId: selectedCourseId }}
              placeholder="Search students by name or e-mail..."
            />
          </div>
        )}
        <GenerateCertificateForm
          key={`${selectedCourseId}|${q ?? ""}|${safePage}`}
          courses={courses}
          selectedCourseId={selectedCourseId}
          enrollments={candidates.items}
        />
        {selectedCourseId && (
          <div className="mt-4">
            <Pagination
              basePath="/admin/certificates/new"
              params={{ courseId: selectedCourseId, q }}
              page={safePage}
              totalCount={candidates.totalCount}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </div>
    </div>
  );
}
