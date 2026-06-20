import Link from "next/link";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileSummaryCard } from "@/components/profile/ProfileSummaryCard";
import { requireUser } from "@/lib/auth-actions";
import {
  formatDateOfBirthForInput,
  isProfileComplete,
  userProfileSelect,
} from "@/lib/profile";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ complete?: string }>;
}) {
  const session = await requireUser();
  const { complete } = await searchParams;

  const user = await withDbErrorHandling(() => prisma.user.findUnique({
      where: { id: session.user.id },
      select: { ...userProfileSelect, createdAt: true },
    }), "Database operation failed");

  if (!user) {
    return null;
  }

  const profileComplete = isProfileComplete(user);

  return (
    <div className="space-y-6">
      {!profileComplete && (
        <div
          className="rounded-lg border border-warning-text/20 border-l-4 border-l-warning-text bg-warning-bg px-4 py-4 text-sm text-warning-text sm:px-5"
          role="status"
        >
          <p className="font-semibold">Complete your profile to enroll in courses</p>
          <p className="mt-1 text-warning-text/90">
            The academy needs your full details for course registration. Fill in all fields below,
            then return to the course page to request enrollment.
          </p>
        </div>
      )}
      {complete === "1" && profileComplete && (
        <div
          className="rounded-lg border border-violet-200 border-l-4 border-l-violet-500 bg-info-bg px-4 py-4 text-sm text-info-text sm:px-5"
          role="status"
        >
          <p className="font-semibold">Your profile is complete</p>
          <p className="mt-1">
            You can browse courses and request enrollment. Any enrollment or monthly fees are shown
            on each course.
          </p>
          <Link
            href="/courses"
            className="mt-3 inline-flex min-h-10 items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light"
          >
            Browse courses
          </Link>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start">
        <ProfileSummaryCard
          name={user.name}
          email={user.email}
          memberSince={user.createdAt}
          profileComplete={profileComplete}
          occupation={user.occupation}
        />

        <ProfileForm
          name={user.name}
          email={user.email}
          fatherName={user.fatherName}
          dateOfBirth={formatDateOfBirthForInput(user.dateOfBirth)}
          occupation={user.occupation}
          address={user.address}
          whatsapp={user.whatsapp}
        />
      </div>
    </div>
  );
}
