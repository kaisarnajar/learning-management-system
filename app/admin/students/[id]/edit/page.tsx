import { notFound } from "next/navigation";
import Link from "next/link";
import { StudentForm } from "@/components/admin/StudentForm";
import { updateStudentUserForm } from "@/app/admin/students/actions";
import { getStudentUserById } from "@/services/students";

export default async function EditStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const student = await getStudentUserById(id);
  if (!student) notFound();

  return (
    <div>
      <Link href={`/admin/students/${id}`} className="text-sm text-primary hover:underline">
        ← Back to student profile
      </Link>
      
      <div className="mt-6 border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-bold text-primary">Edit Student</h1>
        <p className="mt-1 text-sm text-muted">Update student profile details.</p>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
        <StudentForm
          student={student}
          action={updateStudentUserForm.bind(null, id)}
          submitLabel="Save Changes"
          error={query.error ? decodeURIComponent(query.error) : undefined}
        />
      </div>
    </div>
  );
}
