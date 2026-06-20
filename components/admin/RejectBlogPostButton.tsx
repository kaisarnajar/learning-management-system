"use client";

import { rejectBlogPost } from "@/app/admin/blog-approvals/actions";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { usePathname, useSearchParams } from "next/navigation";
import { getReturnToUrl } from "@/components/shared/ActionButton";

export function RejectBlogPostButton({ postId }: { postId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = getReturnToUrl(pathname, searchParams);

  return (
    <ConfirmationModal
      title="Reject Blog Post"
      description="Reject this blog post? The teacher can edit and resubmit it."
      actionLabel="Reject"
      variant="destructive"
      onConfirm={async () => {
         const result = await rejectBlogPost(postId, returnTo);
         if (result?.error) { window.alert(result.error); }
      }}
      trigger={
        <button type="button" className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">
          Reject
        </button>
      }
    />
  );
}
