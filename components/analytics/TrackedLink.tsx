"use client";

import Link, { LinkProps } from "next/link";
import { ReactNode } from "react";
import { trackButtonClick } from "@/lib/analytics-client";

type TrackedLinkProps = React.ComponentProps<typeof Link> & {
  eventName: string;
  pageName: string;
};

export function TrackedLink({ eventName, pageName, className, children, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      className={className}
      onClick={(e) => {
        trackButtonClick(eventName, pageName);
        if (onClick) {
          onClick(e);
        }
      }}
    >
      {children}
    </Link>
  );
}
