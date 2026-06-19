"use server";

import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { isDeveloperSession } from "@/lib/developer";
import { getTeacherForSession, isTeacherSession } from "@/lib/teacher-auth";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const session = await auth();
  if (!isAdminSession(session)) {
    redirect("/login?callbackUrl=/admin");
  }
  return session!;
}

export async function requireDeveloper() {
  const session = await auth();
  if (!isDeveloperSession(session)) {
    redirect("/login?callbackUrl=/developer");
  }
  return session!;
}

export async function requireTeacher() {
  const session = await auth();
  if (!isTeacherSession(session)) {
    redirect("/login?callbackUrl=/teacher");
  }
  const teacher = await getTeacherForSession(session);
  if (!teacher) {
    redirect("/login?error=teacher-profile");
  }
  return { session: session!, teacher };
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }
  if (session.user.role === "TEACHER") {
    redirect("/teacher");
  }
  return session;
}
