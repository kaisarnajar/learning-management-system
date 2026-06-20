"use client";

import { deleteTeacherById } from "@/app/admin/teachers/actions";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

type DeleteTeacherButtonProps = {
  id: string;
  label: string;
};

export function DeleteTeacherButton({ id, label }: DeleteTeacherButtonProps) {
  return (
    <DeleteActionButton
      action={deleteTeacherById.bind(null, id)}
      itemName={label}
      onSuccessRedirect="/admin/teachers?deleted=1"
    />
  );
}
