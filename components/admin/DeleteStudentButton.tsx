"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteStudentUser } from "@/app/admin/students/actions";

type DeleteStudentButtonProps = {
  id: string;
  label: string;
};

export function DeleteStudentButton({ id, label }: DeleteStudentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const message = `Delete this student account?\n\n${label}\n\nAll enrollments will be removed. This cannot be undone.`;
    if (!window.confirm(message)) return;

    setLoading(true);
    const result = await deleteStudentUser(id);
    setLoading(false);

    if (result.error) {
      window.alert(result.error);
      return;
    }

    router.push("/admin/students?deleted=1");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60"
    >
      {loading ? "…" : "Delete"}
    </button>
  );
}
