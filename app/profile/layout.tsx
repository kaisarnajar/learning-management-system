import type { Metadata } from "next";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { VerificationBanner } from "@/components/auth/VerificationBanner";
import { requireUser } from "@/lib/auth-actions";
import { getUnreadNotificationCount } from "@/lib/notifications";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your profile, payments, and courses at Darse Quran Academy.",
};

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const unreadCount = await getUnreadNotificationCount(session.user.id);


  return (
    <div className="bg-background min-h-screen pb-12 pt-6">
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
