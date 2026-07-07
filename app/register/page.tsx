import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Section } from "@/components/site/Section";

export const metadata: Metadata = {
  title: "Register",
  description: `Create an account at ${BRAND_CONFIG.name}.`,
};

const googleEnabled =
  Boolean(process.env.AUTH_GOOGLE_ID) && Boolean(process.env.AUTH_GOOGLE_SECRET);

export default function RegisterPage() {
  return (
    <Section>
      <div className="card-elevated mx-auto max-w-lg p-6 sm:p-8">
        <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
          <RegisterForm googleEnabled={googleEnabled} />
        </Suspense>
      </div>
    </Section>
  );
}
