import Link from "next/link";
import { ProfileSection } from "@/components/profile/ProfileSection";
import { requireUser } from "@/services/auth-actions";
import {
  isProfileComplete,
  userProfileSelect,
} from "@/services/profile";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ complete?: string; source?: string; callbackUrl?: string }>;
}) {
  const session = await requireUser();
  const { complete, source, callbackUrl } = await searchParams;

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
      {/* Personalized Google sign-in welcome banner */}
      {source === "google" && !profileComplete && (
        <div
          className="rounded-lg border border-blue-200 dark:border-blue-900/50 border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20 px-4 py-4 text-sm sm:px-5"
          role="status"
        >
          <div className="flex items-start gap-3">
            {/* Google "G" logo */}
            <svg className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-200">
                Welcome! You signed in with Google.
              </p>
              <p className="mt-1 text-blue-800/90 dark:text-blue-300">
                Your email is verified automatically. Please fill in the required profile details
                below — the academy needs them before you can enroll in any course.
              </p>
              {callbackUrl && (
                <p className="mt-1.5 text-blue-700/80 dark:text-blue-400 text-xs">
                  You&apos;ll be taken to your destination once your profile is complete.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generic incomplete-profile banner (email sign-up users) */}
      {!profileComplete && source !== "google" && (
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
          className="rounded-lg border border-violet-200 dark:border-violet-900/50 border-l-4 border-l-violet-500 bg-info-bg px-4 py-4 text-sm text-info-text sm:px-5"
          role="status"
        >
          <p className="font-semibold">Your profile is complete</p>
          <p className="mt-1">
            You can browse courses and request enrollment. Any enrollment or monthly fees are shown
            on each course.
          </p>
          <Link
            href={callbackUrl && callbackUrl.startsWith("/courses") ? callbackUrl : "/courses"}
            className="mt-3 inline-flex min-h-10 items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light"
          >
            Browse courses
          </Link>
        </div>
      )}

      <div>
        <ProfileSection
          name={user.name}
          email={user.email}
          fatherName={user.fatherName}
          dateOfBirth={user.dateOfBirth}
          occupation={user.occupation}
          address={user.address}
          whatsapp={user.whatsapp}
          image={user.image}
          gender={user.gender}
          registrationNumber={user.registrationNumber}
        />
      </div>
    </div>
  );
}
