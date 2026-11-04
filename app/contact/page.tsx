import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import { ContactForm } from "@/components/contact/ContactForm";
import { auth } from "@/services/auth";
import { Source_Serif_4 } from "next/font/google";
import { PageHero } from "@/components/shared/PageHero";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"] });

const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Get in touch with ${BRAND_CONFIG.name} — send us your inquiries, course questions, or feedback and our team will get back to you.`,
  alternates: {
    canonical: `${baseUrl}/contact`,
  },
  openGraph: {
    title: `Contact Us | ${BRAND_CONFIG.name}`,
    description: `Get in touch with ${BRAND_CONFIG.name} — support, inquiries, and admissions info.`,
    url: `${baseUrl}/contact`,
    siteName: BRAND_CONFIG.name,
    type: "website",
    images: [
      {
        url: BRAND_CONFIG.seo.openGraphImage,
        alt: `Contact - ${BRAND_CONFIG.name}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Contact Us | ${BRAND_CONFIG.name}`,
    description: `Get in touch with ${BRAND_CONFIG.name} for course inquiries and support.`,
    images: [BRAND_CONFIG.seo.openGraphImage],
  },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const params = await searchParams;
  const [session] = await Promise.all([auth()]);

  return (
    <>
      {/* Hero Section */}
      <PageHero tall title="Send a Message" description="We would love to hear from you. Please fill out the form below and our team will get back to you within 2-3 business days." />

      {/* Form Section */}
      <section className="relative bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          
          {params.submitted === "1" && (
            <div className="motion-safe:animate-fade-up mb-8 rounded-xl border border-brand-gold-alt/30 bg-gold/5 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold/20 text-gold">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className={`${sourceSerif.className} text-xl font-semibold text-primary`}>Message Sent Successfully</h3>
              <p className="mt-2 text-muted">
                Thank you. Your message has been received. We aim to respond within 2–3 business days.
              </p>
            </div>
          )}

          <div className="motion-safe:animate-fade-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
            <ContactForm
              defaultName={session?.user?.name ?? ""}
              defaultEmail={session?.user?.email ?? ""}
              isLoggedIn={Boolean(session?.user)}
            />
          </div>
        </div>
      </section>
    </>
  );
}
