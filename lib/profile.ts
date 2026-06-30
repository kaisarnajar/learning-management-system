import type { User } from "@prisma/client";
import { OCCUPATION_OPTIONS, occupationLabel } from "@/lib/occupations";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

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
} as const;

export type UserProfileData = Pick<User, keyof typeof userProfileSelect>;

export function formatDateOfBirthForInput(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function formatDateOfBirthDisplay(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isProfileComplete(user: Partial<UserProfileData>): boolean {
  return Boolean(
    user.name?.trim() &&
      user.fatherName?.trim() &&
      user.dateOfBirth &&
      user.occupation &&
      user.address?.trim() &&
      user.whatsapp?.trim() &&
      user.email?.trim(),
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

export const PROFILE_COMPLETE_REDIRECT = "/profile?complete=1";
