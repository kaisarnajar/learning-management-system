import type { Gender, Occupation, Prisma } from "@prisma/client";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { generateNextRegistrationNumberTx } from "@/services/registration";
import { businessCalendarParts } from "@/services/business-time";
import { isProfileComplete, userProfileSelect } from "@/services/profile";

/** Profile columns a student may change about themselves. */
export type StudentProfileChanges = {
  name?: string;
  fatherName?: string;
  dateOfBirth?: Date;
  occupation?: Occupation;
  address?: string;
  whatsapp?: string;
  gender?: Gender;
  image?: string | null;
};

/**
 * Saves a student's own profile changes (website form and mobile API).
 *
 * When the change completes the profile and the student has no registration
 * number yet, one is allocated in the same transaction as the update, so a
 * rolled-back update never burns a number and two concurrent completions can
 * never share one. The number's year is the year (in the academy's timezone) the account was created.
 */
export async function applyStudentProfileChanges(userId: string, changes: StudentProfileChanges) {
  return withDbErrorHandling(() => prisma.$transaction(async (tx) => {
    const current = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: userProfileSelect });
    const data: Prisma.UserUpdateInput = { ...changes };

    const merged = { ...current, ...changes };
    if (isProfileComplete(merged) && !current.registrationNumber) {
      data.registrationNumber = await generateNextRegistrationNumberTx(tx, businessCalendarParts(current.createdAt).year);
    }

    return tx.user.update({ where: { id: userId }, data, select: { id: true, ...userProfileSelect } });
  }), "Database operation failed");
}
