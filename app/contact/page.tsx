import type { Metadata } from "next";
import { BRAND_CONFIG } from "@/config/brand";
import { ContactForm } from "@/components/contact/ContactForm";
import { auth } from "@/lib/auth";
import { Source_Serif_4 } from "next/font/google";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Get in touch with ${BRAND_CONFIG.name} — send your query and we will reply by email.`,
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#003527] via-teal-900 to-[#002117] px-4 py-24 sm:px-6 lg:px-8">
        <div className="pattern-islamic absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50"></div>
        <div className="mx-auto max-w-4xl text-center">
          <div className="motion-safe:animate-fade-up">
            <h1 className={`${sourceSerif.className} text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl`}>
              Send a Message
            </h1>
            <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-brand-gold-alt"></div>
            <p className="mt-8 text-lg leading-relaxed text-white/90 sm:text-xl">
              We would love to hear from you. Please fill out the form below and our team will get back to you within 2-3 business days.
            </p>
          </div>
        </div>
      </section>

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
