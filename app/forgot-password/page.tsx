import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Section } from "@/components/site/Section";

export const metadata: Metadata = {
  title: "Reset Password",
  description: `Request a password reset link for your ${BRAND_CONFIG.name} account.`,
};

export default function ForgotPasswordPage() {
  return (
    <Section>
      <div className="card-elevated mx-auto max-w-lg p-6 sm:p-8">
        <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </Section>
  );
}
