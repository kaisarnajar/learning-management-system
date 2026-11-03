"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/services/admin";
import { isDeveloperEmail } from "@/services/developer";
import { recordAudit } from "@/services/audit";
import { requireAdmin } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";

function revalidateStudentPaths(courseIds: string[] = []) {
  revalidatePath("/admin/students");
  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/courses");
  revalidatePath("/admin");
  revalidatePath("/profile");
  revalidatePath("/profile/courses");
  revalidatePath("/profile/payments");
  for (const courseId of courseIds) {
    revalidatePath(`/admin/courses/${courseId}/students`);
  }
}

/**
 * Soft-deletes a student account. The row is kept (deletedAt set, e-mail
 * anonymised so the address can register again) and every financial or
 * academic record stays intact. Refused while the student still has active
 * enrollments, pending fee submissions or unvoided payment records, and for
 * admin, developer or teacher accounts.
 */
export async function deleteStudentUser(id: string): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();

  const user = await withDbErrorHandling(() => prisma.user.findUnique({ where: { id } }), "Database operation failed");
  if (!user || user.deletedAt) {
    return { error: "Student not found." };
  }

  if (isAdminEmail(user.email) || isDeveloperEmail(user.email)) {
    return { error: "Admin and developer accounts cannot be deleted from here." };
  }

  const teacher = await withDbErrorHandling(
    () => prisma.teacher.findUnique({ where: { email: user.email.toLowerCase() }, select: { id: true } }),
    "Database operation failed",
  );
  if (teacher) {
    return { error: "This account belongs to a teacher. Remove the teacher profile first." };
  }

  const [activeEnrollments, pendingSubmissions, paymentRecords] = await Promise.all([
    withDbErrorHandling(() => prisma.enrollment.count({ where: { userId: id, status: { in: [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.PENDING, ENROLLMENT_STATUS.AWAITING_FEE] } } }), "Database operation failed"),
    withDbErrorHandling(() => prisma.coursePaymentSubmission.count({ where: { userId: id, deletedAt: null, status: PAYMENTS.SUBMISSION_STATUS.PENDING } }), "Database operation failed"),
    withDbErrorHandling(() => prisma.paymentRecord.count({ where: { userId: id, voidedAt: null } }), "Database operation failed"),
  ]);

  if (activeEnrollments > 0) {
    return { error: `Cannot delete: the student has ${activeEnrollments} active or pending enrollment(s). Remove them first.` };
  }
  if (pendingSubmissions > 0) {
    return { error: "Cannot delete: the student has fee payments awaiting verification. Confirm or decline them first." };
  }
  if (paymentRecords > 0) {
    return { error: "Cannot delete: the student has payment records. Accounts with financial history are kept for auditing; void the records first if they are wrong." };
  }

  const courseIds = (
    await withDbErrorHandling(() => prisma.enrollment.findMany({
            where: { userId: id },
            select: { courseId: true },
          }), "Database operation failed")
  ).map((e) => e.courseId);

  const anonymisedEmail = `deleted+${id}@invalid.local`;

  await withDbErrorHandling(() => prisma.$transaction(async (tx) => {
    // Auth artefacts are not history: remove them so the account cannot sign in.
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.account.deleteMany({ where: { userId: id } });
    await tx.deviceToken.deleteMany({ where: { userId: id } });
    await tx.passwordResetToken.deleteMany({ where: { email: user.email } });
    await tx.user.update({
      where: { id },
      data: { deletedAt: new Date(), email: anonymisedEmail, password: null, image: null },
    });
    await recordAudit(tx, session, {
      action: "soft_delete",
      entity: "User",
      entityId: id,
      before: { email: user.email, name: user.name, registrationNumber: user.registrationNumber },
      after: { email: anonymisedEmail, deletedAt: new Date().toISOString() },
    });
  }), "Database operation failed");

  revalidateStudentPaths(courseIds);

  return { success: "Student account removed. Records are kept for auditing." };
}

export async function deleteStudentUserForm(id: string) {
  const result = await deleteStudentUser(id);
  if (result.error) {
    redirect(`/admin/students/${id}?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/admin/students?deleted=1");
}

import { validateStudentForm, type StudentFormValues } from "@/services/admin-form-validation";
import { Occupation, Gender } from "@prisma/client";
import { ENROLLMENT_STATUS } from "@/config/constants/business";
import { PAYMENTS } from "@/config/constants/payments";
import { deleteProfileImage } from "@/services/profile-upload";
import { getStudentUserById } from "@/services/students";

function parseStudentForm(formData: FormData): StudentFormValues {
  return {
    name: (formData.get("name") as string) ?? "",
    fatherName: (formData.get("fatherName") as string) ?? "",
    dateOfBirth: (formData.get("dateOfBirth") as string) ?? "",
    occupation: (formData.get("occupation") as string) ?? "",
    address: (formData.get("address") as string) ?? "",
    whatsapp: (formData.get("whatsapp") as string) ?? "",
    gender: (formData.get("gender") as any) ?? "",
  };
}

export async function updateStudentUserForm(id: string, formData: FormData) {
  await requireAdmin();
  
  const values = parseStudentForm(formData);
  const parsed = validateStudentForm(values);
  
  if (!parsed.success) {
    redirect(`/admin/students/${id}/edit?error=${encodeURIComponent(parsed.issues[0]?.message ?? "Invalid input")}`);
  }
  
  const currentStudent = await getStudentUserById(id);
  if (!currentStudent) {
    // Admin/developer accounts and deleted users are not editable here.
    redirect(`/admin/students/${id}/edit?error=${encodeURIComponent("Student not found.")}`);
  }
  let updateImage = undefined;
  
  if (values.gender === "FEMALE") {
    if (currentStudent?.image && currentStudent.image !== "/assets/female_icon.png") {
      await deleteProfileImage(currentStudent.image);
    }
    updateImage = "/assets/female_icon.png";
  } else if (values.gender === "MALE") {
    if (currentStudent?.image === "/assets/female_icon.png" || !currentStudent?.image) {
      updateImage = "/assets/male_icon.png";
    }
  }

  await withDbErrorHandling(() => prisma.user.update({
    where: { id },
    data: {
      name: values.name,
      fatherName: values.fatherName,
      dateOfBirth: new Date(values.dateOfBirth),
      occupation: values.occupation as Occupation,
      address: values.address,
      whatsapp: values.whatsapp,
      gender: values.gender as Gender,
      ...(updateImage !== undefined ? { image: updateImage } : {}),
    },
  }), "Database operation failed");

  revalidateStudentPaths();
  revalidatePath(`/admin/students/${id}`);
  
  redirect(`/admin/students/${id}?saved=1`);
}
