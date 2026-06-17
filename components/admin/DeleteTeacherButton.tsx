"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteTeacherById } from "@/app/admin/teachers/actions";

type DeleteTeacherButtonProps = {
  id: string;
  label: string;
};

export function DeleteTeacherButton({ id, label }: DeleteTeacherButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const message = `Delete this teacher profile?\n\n${label}\n\nThis cannot be undone.`;
    if (!window.confirm(message)) return;

    setLoading(true);
    const result = await deleteTeacherById(id);
    setLoading(false);

    if (result.error) {
      window.alert(result.error);
      return;
    }

    router.push("/admin/teachers?deleted=1");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-red-100 disabled:opacity-60"
    >
      {loading ? "…" : "Delete"}
    </button>
  );
}
