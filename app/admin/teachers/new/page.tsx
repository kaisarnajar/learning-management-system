import Link from "next/link";
import { TeacherForm } from "@/components/admin/TeacherForm";
import { createTeacher } from "@/app/admin/teachers/actions";
import { requireAdmin } from "@/services/auth-actions";

export default async function NewTeacherPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;

  return (
    <div>
      <Link href="/admin/teachers" className="text-sm text-primary hover:underline">
        ← Back to teachers
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">Add teacher</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Link an existing site account by email. The teacher must register first; you assign specialization and
        public profile details.
      </p>
      <div className="mt-8">
        <TeacherForm
          action={createTeacher}
          submitLabel="Create teacher"
          error={query.error ? decodeURIComponent(query.error) : undefined}
        />
      </div>
    </div>
  );
}
