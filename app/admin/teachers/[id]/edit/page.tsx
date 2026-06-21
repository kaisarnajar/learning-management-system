import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { TeacherForm } from "@/components/admin/TeacherForm";
import { deleteTeacher, updateTeacher } from "@/app/admin/teachers/actions";
import { getTeacherById } from "@/lib/teachers";
import { ActionToast } from "@/components/shared/ToastProvider";


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

      <ActionToast trigger={query.saved === "1"} paramName="saved" message="Changes saved." variant="info" />
      <ActionToast trigger={query.created === "1"} paramName="created" message="Teacher created." variant="info" />

      <div className="mt-8">
        <TeacherForm
          teacher={teacher}
          action={boundUpdate}
          submitLabel="Save changes"
          error={query.error ? decodeURIComponent(query.error) : undefined}
        />
      </div>

      <DeleteActionButton action={boundDelete} itemName="teacher" />
    </div>
  );
}
