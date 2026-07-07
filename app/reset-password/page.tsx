import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Section } from "@/components/site/Section";

export const metadata: Metadata = {
  title: "Choose New Password",
  description: `Set a new password for your ${BRAND_CONFIG.name} account.`,
};

export default function ResetPasswordPage() {
  return (
    <Section>
      <div className="card-elevated mx-auto max-w-lg p-6 sm:p-8">
        <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </Section>
  );
}
