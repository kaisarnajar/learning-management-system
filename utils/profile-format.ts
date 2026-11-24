/**
 * Profile display helpers.
 * Pure (no Prisma, no server APIs), so client components import them
 * here; the service module re-exports them for server code.
 */

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

export const PROFILE_COMPLETE_REDIRECT = "/profile?complete=1";
