import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Section } from "@/components/site/Section";

export const metadata: Metadata = {
  title: "Sign In",
  description: `Sign in to ${BRAND_CONFIG.name} to enroll in courses.`,
};

const googleEnabled =
  Boolean(process.env.AUTH_GOOGLE_ID) && Boolean(process.env.AUTH_GOOGLE_SECRET);

export default function LoginPage() {
  return (
    <Section>
      <div className="card-elevated mx-auto max-w-lg p-6 sm:p-8">
        <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
          <LoginForm googleEnabled={googleEnabled} />
        </Suspense>
      </div>
    </Section>
  );
}
