"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteContactInquiryById } from "@/app/admin/contact-inquiries/actions";

type DeleteContactInquiryButtonProps = {
  id: string;
  label: string;
};

export function DeleteContactInquiryButton({ id, label }: DeleteContactInquiryButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const message = `Delete this contact inquiry?\n\n${label}\n\nThis cannot be undone.`;
    if (!window.confirm(message)) return;

    setLoading(true);
    const result = await deleteContactInquiryById(id);
    setLoading(false);

    if (result.error) {
      window.alert(result.error);
      return;
    }

    router.push("/admin/contact-inquiries?deleted=1");
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
