import { requireUser } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { WaiverRequestsView } from "@/components/profile/WaiverRequestsView";

export const metadata = {
  title: "Fee Waiver Requests | Darse Quran Academy",
};

export default async function WaiverRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; type?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;

  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const requests = await prisma.couponRequest.findMany({
    where: { userId: session.user.id },
    include: {
      course: { select: { title: true } },
      coupon: { select: { code: true, percentage: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const defaultType = params.type === "enrollment" ? "enrollment" : params.type === "course" ? "course" : "";

  return (
    <WaiverRequestsView
      courses={courses}
      requests={requests}
      initialCourseId={params.courseId}
      initialType={defaultType}
    />
  );
}
