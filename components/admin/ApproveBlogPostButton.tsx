"use client";

import { approveBlogPost } from "@/app/admin/blog-approvals/actions";
import { ActionButton } from "@/components/shared/ActionButton";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { usePathname, useSearchParams } from "next/navigation";
import { getReturnToUrl } from "@/components/shared/ActionButton";

export function ApproveBlogPostButton({ postId }: { postId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = getReturnToUrl(pathname, searchParams);

  return (
    <ConfirmationModal
      title="Approve Blog Post"
      description="Approve this blog post and publish it on the public blog?"
      actionLabel="Approve"
      variant="primary"
      onConfirm={async () => {
         const result = await approveBlogPost(postId, returnTo);
         if (result?.error) { window.alert(result.error); }
      }}
      trigger={
        <button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">
          Approve
        </button>
      }
    />
  );
}
