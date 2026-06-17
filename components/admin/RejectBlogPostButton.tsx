"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { rejectBlogPost } from "@/app/admin/blog-approvals/actions";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export function RejectBlogPostButton({ postId }: { postId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  if (hidden) return null;

  function getReturnTo() {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function handleReject() {
    if (!window.confirm("Reject this blog post? The teacher can edit and resubmit it.")) return;

    startTransition(async () => {
      try {
        const result = await rejectBlogPost(postId, getReturnTo());
        if (result?.error) {
          window.alert(result.error);
          return;
        }
        setHidden(true);
      } catch (error) {
        if (isRedirectError(error)) {
          setHidden(true);
          return;
        }
        window.alert("Could not reject blog post. Please try again.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleReject}
      disabled={pending}
      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60"
    >
      {pending ? "…" : "Reject"}
    </button>
  );
}
