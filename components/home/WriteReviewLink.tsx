"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

const REVIEW_PATH = "/profile/reviews";

/**
 * The homepage "Write Review" button. It is the only session-dependent part
 * of the testimonials section, so it reads the session on the client and
 * lets the section itself be rendered statically and cached.
 */
export function WriteReviewLink({ className }: { className?: string }) {
  const { data: session } = useSession();
  const href =
    session?.user?.id && session.user.role !== "TEACHER"
      ? REVIEW_PATH
      : `/login?callbackUrl=${encodeURIComponent(REVIEW_PATH)}`;

  return (
    <Link href={href} className={className}>
      Write Review
    </Link>
  );
}
