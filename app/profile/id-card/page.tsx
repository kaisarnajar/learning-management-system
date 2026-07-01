import { requireUser } from "@/lib/auth-actions";
import { isUserProfileComplete } from "@/lib/profile";
import { IdCardPreview } from "@/components/profile/IdCardPreview";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";

export default async function IdCardPage() {
  const session = await requireUser();
  const profileComplete = await isUserProfileComplete(session.user.id);

  if (!profileComplete) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Digital ID Card"
          description="Your official virtual student identification card."
        />
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <div className="mb-4 rounded-full bg-warning-bg p-4 text-warning-text">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">
            Profile Incomplete
          </h3>
          <p className="mb-6 max-w-md text-muted">
            You need to complete your profile with all required details before you can generate and view your Student ID Card.
          </p>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light shadow-sm"
          >
            Complete Profile
          </Link>
        </div>
      </div>
    );
  }

  return <IdCardPreview />;
}
