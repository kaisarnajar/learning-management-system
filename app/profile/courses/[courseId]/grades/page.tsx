import { requireUser } from "@/services/auth-actions";
import { getStudentGradeRecords } from "@/app/actions/grades";
import { StudentGradeReport } from "@/components/grades/StudentGradeReport";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";

export default async function StudentCourseGradePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await requireUser();
  const session = await auth();
  const { courseId } = await params;
  
  const records = await getStudentGradeRecords(courseId);

  // We need to fetch the course details for the report
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true },
  });

  return (
    <div className="py-6 space-y-6">
      <StudentGradeReport
        backUrl={`/profile/courses`}
        studentName={session?.user?.name || null}
        studentEmail={session?.user?.email || ""}
        courseTitle={course?.title || "Course"}
        records={records}
      />
    </div>
  );
}
