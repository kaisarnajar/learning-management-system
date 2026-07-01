import type { Metadata } from "next";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { VerificationBanner } from "@/components/auth/VerificationBanner";
import { requireUser } from "@/lib/auth-actions";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getUserProfile } from "@/lib/profile";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your profile, payments, and courses at Darse Quran Academy.",
};

function profileHeaderDescription(name: string | null | undefined) {
  const trimmedName = name?.trim();

  if (trimmedName) {
    return (
      <>
        Welcome back, <span className="font-semibold text-foreground">{trimmedName}</span>. Manage
        your courses, payments, and profile details.
      </>
    );
  }

  return "Manage your courses, payments, and profile details.";
}

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const [profile, unreadCount] = await Promise.all([
    getUserProfile(session.user.id),
    getUnreadNotificationCount(session.user.id),
  ]);

  const description = profileHeaderDescription(profile?.name ?? session.user.name);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12 pt-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {!session.user.emailVerified && (
          <div className="mb-8">
            <VerificationBanner />
          </div>
        )}
        
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          <ProfileSidebar unreadCount={unreadCount} />
          <div className="min-w-0 flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
