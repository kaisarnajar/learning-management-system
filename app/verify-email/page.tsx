import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/login");
  }

  const existingToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!existingToken) {
    return <VerificationResult success={false} message="Invalid verification token." />;
  }

  if (new Date() > existingToken.expires) {
    return <VerificationResult success={false} message="Verification token has expired." />;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: existingToken.identifier },
  });

  if (!existingUser) {
    return <VerificationResult success={false} message="Account not found." />;
  }

  await prisma.user.update({
    where: { id: existingUser.id },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier: existingToken.identifier,
        token: existingToken.token,
      },
    },
  });

  return <VerificationResult success={true} message="Your email has been verified successfully." />;
}

function VerificationResult({ success, message }: { success: boolean; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-sm text-center">
        {success ? (
          <svg className="mx-auto h-16 w-16 text-success-text" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        ) : (
          <svg className="mx-auto h-16 w-16 text-destructive-text" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
          </svg>
        )}
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          {success ? "Email Verified" : "Verification Failed"}
        </h1>
        <p className="mt-2 text-muted">{message}</p>
        <div className="mt-6">
          <Link
            href={success ? "/profile" : "/login"}
            className="inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
          >
            {success ? "Go to Dashboard" : "Back to Login"}
          </Link>
        </div>
      </div>
    </div>
  );
}
