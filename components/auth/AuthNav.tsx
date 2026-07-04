"use client";


import { useSession } from "next-auth/react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import Link from "next/link";

export function AuthNav({ mobile = false, onLinkClick }: { mobile?: boolean; onLinkClick?: () => void }) {
  const { data: session, status } = useSession();

  const linkClass = mobile
    ? "flex min-h-11 items-center rounded-md px-3 text-base font-medium text-foreground active:bg-accent-muted/50"
    : "whitespace-nowrap rounded-md px-1.5 py-2 text-[0.6875rem] font-semibold text-foreground transition-colors hover:bg-accent-muted/50 hover:text-primary 2xl:px-2.5 2xl:text-sm";

  if (status === "loading") {
    return (
      <span className={`${linkClass} text-muted`} aria-hidden>
        …
      </span>
    );
  }

  if (session?.user) {
    return (
      <div className={mobile ? "flex flex-col" : "flex items-center gap-0.5"}>
        {session.user.role === "ADMIN" && (
          <Link href="/admin" className={linkClass} onClick={onLinkClick}>
            Admin
          </Link>
        )}
        {session.user.role === "DEVELOPER" && (
          <Link href="/admin" className={linkClass} onClick={onLinkClick}>
            Developer
          </Link>
        )}
        {session.user.role === "TEACHER" && (
          <Link href="/teacher" className={linkClass} onClick={onLinkClick}>
            {mobile ? "Teacher portal" : "Teacher"}
          </Link>
        )}
        <Link href="/profile" className={linkClass} onClick={onLinkClick}>
          {mobile ? "My Profile" : "Profile"}
        </Link>
        <SignOutButton className={`${linkClass} ${mobile ? "w-full text-left" : ""}`}>
          Sign Out
        </SignOutButton>
      </div>
    );
  }

  return (
    <div className={mobile ? "flex flex-col gap-1" : "flex items-center gap-1"}>
      <Link href="/login" className={linkClass} onClick={onLinkClick}>
        Sign In
      </Link>
      <Link
        href="/register"
        className={
          mobile
            ? "flex min-h-11 items-center rounded-full bg-primary px-3 text-base font-medium text-white"
            : "whitespace-nowrap rounded-full bg-primary px-2 py-2 text-[0.6875rem] font-semibold text-white transition-colors hover:bg-primary-light 2xl:px-3 2xl:text-sm"
        }
        onClick={onLinkClick}
      >
        Register
      </Link>
    </div>
  );
}
