"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { TrackedLink } from "@/components/analytics/TrackedLink";

export function AuthNav({ mobile = false }: { mobile?: boolean }) {
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
          <TrackedLink href="/admin" eventName="Admin" pageName="auth-nav" className={linkClass}>
            Admin
          </TrackedLink>
        )}
        {session.user.role === "DEVELOPER" && (
          <TrackedLink href="/admin" eventName="Developer" pageName="auth-nav" className={linkClass}>
            Developer
          </TrackedLink>
        )}
        {session.user.role === "TEACHER" && (
          <TrackedLink href="/teacher" eventName="Teacher Portal" pageName="auth-nav" className={linkClass}>
            {mobile ? "Teacher portal" : "Teacher"}
          </TrackedLink>
        )}
        {session.user.role !== "TEACHER" && (
          <TrackedLink href="/profile" eventName="Profile" pageName="/" className={linkClass}>
          {mobile ? "My Profile" : "Profile"}
        </TrackedLink>
        )}
        <SignOutButton className={`${linkClass} ${mobile ? "w-full text-left" : ""}`}>
          Sign Out
        </SignOutButton>
      </div>
    );
  }

  return (
    <div className={mobile ? "flex flex-col gap-1" : "flex items-center gap-1"}>
      <TrackedLink href="/login" eventName="Login" pageName="/" className={linkClass}>
        Sign In
      </TrackedLink>
      <TrackedLink
        href="/register"
        eventName="Register"
        pageName="/"
        className={
          mobile
            ? "flex min-h-11 items-center rounded-full bg-primary px-3 text-base font-medium text-white"
            : "whitespace-nowrap rounded-full bg-primary px-2 py-2 text-[0.6875rem] font-semibold text-white transition-colors hover:bg-primary-light 2xl:px-3 2xl:text-sm"
        }
      >
        Register
      </TrackedLink>
    </div>
  );
}
