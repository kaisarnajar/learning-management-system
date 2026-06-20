"use client";

import { deleteContactInquiryById } from "@/app/admin/contact-inquiries/actions";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

type DeleteContactInquiryButtonProps = {
  id: string;
  label: string;
};

export function DeleteContactInquiryButton({ id, label }: DeleteContactInquiryButtonProps) {
  return (
    <DeleteActionButton
      action={deleteContactInquiryById.bind(null, id)}
      itemName={label}
      onSuccessRedirect="/admin/contact-inquiries?deleted=1"
    />
  );
}
