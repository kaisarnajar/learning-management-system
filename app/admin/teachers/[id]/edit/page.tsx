import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { TeacherForm } from "@/components/admin/TeacherForm";
import { deleteTeacher, updateTeacher } from "@/app/admin/teachers/actions";
import { getTeacherById } from "@/lib/teachers";

export default async function EditTeacherPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; created?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const teacher = await getTeacherById(id);

  if (!teacher) notFound();

  const boundUpdate = updateTeacher.bind(null, id);
  const boundDelete = deleteTeacher.bind(null, id);

  return (
    <div>
      <Link href={`/admin/teachers/${id}`} className="text-sm text-primary hover:underline">
        ← Back to teacher profile
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">Edit teacher</h1>

      {query.saved === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Changes saved.</p>
      )}
      {query.created === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Teacher created.</p>
      )}

      <div className="mt-8">
        <TeacherForm
          teacher={teacher}
          action={boundUpdate}
          submitLabel="Save changes"
          error={query.error ? decodeURIComponent(query.error) : undefined}
        />
      </div>

      <DeleteForm action={boundDelete} label="Delete teacher" />
    </div>
  );
}
