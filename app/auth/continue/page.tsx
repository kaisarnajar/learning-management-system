import { auth } from "@/lib/auth";
import { getPostLoginPath } from "@/lib/auth-redirect";
import { isUserProfileComplete } from "@/lib/profile";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function AuthContinuePage({ searchParams }: PageProps) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const target = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(target)}`);
  }

  // For regular (non-role-gated) users, enforce profile completion.
  // Teachers, Admins, and Developers go straight to their dashboards.
  const role = session.user.role;
  if (role === "USER") {
    const profileComplete = await isUserProfileComplete(session.user.id);
    if (!profileComplete) {
      // Redirect to the profile page with a personalized Google welcome banner.
      // We pass source=google so the profile page can show the right message.
      const params = new URLSearchParams({ complete: "1", source: "google" });
      if (target !== "/") params.set("callbackUrl", target);
      redirect(`/profile?${params.toString()}`);
    }
  }

  redirect(getPostLoginPath(session.user.role, target));
}
