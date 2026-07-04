import { requireAdmin } from "@/lib/auth-actions";
import { prisma } from "@/lib/prisma";
import { GenerateCertificateForm } from "@/components/admin/certificates/GenerateCertificateForm";
import Link from "next/link";

export default async function AdminGenerateCertificatePage() {
  await requireAdmin();

  // Fetch enrollments where certificate has NOT been generated yet
  const enrollments = await prisma.enrollment.findMany({
    where: {
      certificateGeneratedAt: null,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { user: { name: "asc" } },
    ],
  });

  const courseIds = Array.from(new Set(enrollments.map((e) => e.courseId)));
  const courses = await prisma.course.findMany({
    where: {
      id: { in: courseIds },
    },
    select: {
      id: true,
      title: true,
    },
  });

  const courseMap = new Map(courses.map((c) => [c.id, c.title]));

  const processedEnrollments = enrollments.map((env) => ({
    id: env.id,
    user: env.user,
    course: {
      id: env.courseId,
      title: courseMap.get(env.courseId) || "Unknown Course",
    },
  }));

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
          Issue a certificate of completion or appreciation for an enrolled student.
        </p>
        <GenerateCertificateForm enrollments={processedEnrollments} />
      </div>
    </div>
  );
}
