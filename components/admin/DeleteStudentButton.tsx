"use client";

import { deleteStudentUser } from "@/app/admin/students/actions";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

type DeleteStudentButtonProps = {
  id: string;
  label: string;
};

export function DeleteStudentButton({ id, label }: DeleteStudentButtonProps) {
  return (
    <DeleteActionButton
      action={deleteStudentUser.bind(null, id)}
      itemName="student account"
      onSuccessRedirect="/admin/students?deleted=1"
    />
  );
}
