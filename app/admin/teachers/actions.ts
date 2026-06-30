"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import {
  deriveTeacherInitials,
  lookupTeacherAccount,
  normalizeTeacherEmail,
} from "@/lib/teacher-admin";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { teacherAdminSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

function parseTeacherForm(formData: FormData) {
  return teacherAdminSchema.safeParse({
    email: formData.get("email"),
    specialization: formData.get("specialization"),
    bio: formData.get("bio"),
    initials: formData.get("initials"),
    published: formData.get("published") === "on",
  });
}

function teacherFormPath(suffix = "", query = "") {
  return `/admin/teachers${suffix}${query}`;
}

export async function createTeacher(formData: FormData) {
  await requireAdmin();
  const parsed = parseTeacherForm(formData);

  if (!parsed.success) {
    redirect(
      teacherFormPath("/new", `?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`),
    );
  }

  const account = await lookupTeacherAccount(parsed.data.email);
  if (!account.ok) {
    redirect(teacherFormPath("/new", `?error=${encodeURIComponent(account.error)}`));
  }

  const initials =
    parsed.data.initials && parsed.data.initials.length > 0
      ? parsed.data.initials.toUpperCase()
      : deriveTeacherInitials(account.name);

  const id = await uniqueSlug(account.name, async (slug) => {
    return Boolean(await withDbErrorHandling(() => prisma.teacher.findUnique({ where: { id: slug } }), "Database operation failed"));
  });

  await withDbErrorHandling(() => prisma.teacher.create({
      data: {
        id,
        name: account.name,
        email: account.email,
        specialization: parsed.data.specialization,
        bio: parsed.data.bio,
        initials,
        imageUrl: account.image || null,
        published: parsed.data.published,
      },
    }), "Database operation failed");

  revalidatePath("/teachers");
  revalidatePath("/");
  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${id}`);
  revalidatePath(`/teachers/${id}`);
  redirect(teacherFormPath("", "?created=1"));
}

export async function updateTeacher(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = parseTeacherForm(formData);

  if (!parsed.success) {
    redirect(
      teacherFormPath(`/${id}/edit`, `?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`),
    );
  }

  const existing = await withDbErrorHandling(() => prisma.teacher.findUnique({ where: { id } }), "Database operation failed");
  if (!existing) {
    redirect(teacherFormPath("", "?error=notfound"));
  }

  const account = await lookupTeacherAccount(parsed.data.email, { excludeTeacherId: id });
  if (!account.ok) {
    redirect(teacherFormPath(`/${id}/edit`, `?error=${encodeURIComponent(account.error)}`));
  }

  const initials =
    parsed.data.initials && parsed.data.initials.length > 0
      ? parsed.data.initials.toUpperCase()
      : deriveTeacherInitials(account.name);

  await withDbErrorHandling(() => prisma.teacher.update({
      where: { id },
      data: {
        name: account.name,
        email: account.email,
        specialization: parsed.data.specialization,
        bio: parsed.data.bio,
        initials,
        imageUrl: account.image || null,
        published: parsed.data.published,
      },
    }), "Database operation failed");

  revalidatePath("/teachers");
  revalidatePath("/");
  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${id}`);
  revalidatePath(`/teachers/${id}`);
  redirect(teacherFormPath("", "?saved=1"));
}

export async function deleteTeacherById(id: string): Promise<{ error?: string }> {
  await requireAdmin();

  const existing = await withDbErrorHandling(() => prisma.teacher.findUnique({ where: { id } }), "Database operation failed");
  if (!existing) {
    return { error: "Teacher not found." };
  }

  await withDbErrorHandling(() => prisma.teacher.delete({ where: { id } }), "Database operation failed");

  revalidatePath("/teachers");
  revalidatePath("/");
  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${id}`);
  revalidatePath(`/teachers/${id}`);

  return {};
}

export async function deleteTeacher(id: string) {
  const result = await deleteTeacherById(id);
  if (result.error) {
    redirect(teacherFormPath(`/${id}/edit`, `?error=${encodeURIComponent(result.error)}`));
  }
  redirect(teacherFormPath("", "?deleted=1"));
}

export async function deleteTeacherFromProfile(id: string) {
  const result = await deleteTeacherById(id);
  if (result.error) {
    redirect(teacherFormPath(`/${id}`, `?error=${encodeURIComponent(result.error)}`));
  }
  redirect(teacherFormPath("", "?deleted=1"));
}

/** Preview linked account for admin form (client). */
export async function previewTeacherAccount(email: string, excludeTeacherId?: string) {
  await requireAdmin();
  if (!email.trim()) {
    return { ok: false as const, error: "Enter an email address." };
  }
  return lookupTeacherAccount(normalizeTeacherEmail(email), { excludeTeacherId });
}
