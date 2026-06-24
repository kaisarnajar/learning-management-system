import type { Metadata } from "next";
import { ProfileNav } from "@/components/profile/ProfileNav";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/site/Section";
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
    <Section>
      <PageHeader title="My Profile" description={description} />
      <div className="mx-auto mt-8 max-w-5xl space-y-8">
        {!session.user.emailVerified && <VerificationBanner />}
        <ProfileNav unreadCount={unreadCount} />
        <div>{children}</div>
      </div>
    </Section>
  );
}
