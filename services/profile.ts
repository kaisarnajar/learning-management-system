import type { User } from "@prisma/client";
import { OCCUPATION_OPTIONS, occupationLabel } from "@/services/occupations";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { PROFILE_COMPLETE_REDIRECT, formatDateOfBirthDisplay, formatDateOfBirthForInput } from "@/utils/profile-format";

// Pure helpers, importable from client components: utils/profile-format.ts
export { PROFILE_COMPLETE_REDIRECT, formatDateOfBirthDisplay, formatDateOfBirthForInput };

export { OCCUPATION_OPTIONS, occupationLabel };

export const userProfileSelect = {
  name: true,
  email: true,
  fatherName: true,
  dateOfBirth: true,
  occupation: true,
  address: true,
  whatsapp: true,
  image: true,
  registrationNumber: true,
  createdAt: true,
  gender: true,
} as const;

export type UserProfileData = Pick<User, keyof typeof userProfileSelect>;

export function isProfileComplete(user: Partial<UserProfileData>): boolean {
  return Boolean(
    user.name?.trim() &&
      user.fatherName?.trim() &&
      user.dateOfBirth &&
      user.occupation &&
      user.address?.trim() &&
      user.whatsapp?.trim() &&
      user.email?.trim() &&
      user.gender,
  );
}

export async function getUserProfile(userId: string): Promise<UserProfileData | null> {
  return withDbErrorHandling(() => prisma.user.findUnique({
      where: { id: userId },
      select: userProfileSelect,
    }), "Database operation failed");
}

export async function isUserProfileComplete(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  if (!profile) return false;
  return isProfileComplete(profile);
}

