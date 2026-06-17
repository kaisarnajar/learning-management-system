import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/ContactForm";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/site/Section";
import { ACADEMY_LOCATION, getAcademyLocationEmbedUrl } from "@/lib/academy-location";
import { auth } from "@/lib/auth";
import {
  buildWhatsAppHref,
  formatWhatsAppForDisplay,
  getSocialLinksSettings,
} from "@/lib/social-links";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Darse Quran Academy — send your query and we will reply by email.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const params = await searchParams;
  const [session, social] = await Promise.all([auth(), getSocialLinksSettings()]);
  const whatsappDisplay = formatWhatsAppForDisplay(social.whatsappNumber);
  const whatsappHref = buildWhatsAppHref(social.whatsappNumber, social.whatsappDefaultMessage);

  return (
    <>
      <Section>
        <PageHeader
          title="Contact Us"
          description="Send us your question and we will reply by email. You can also reach us using the details below."
        />

        {params.submitted === "1" && (
          <p className="mx-auto mt-6 max-w-xl rounded-lg bg-info-bg px-4 py-3 text-center text-sm text-info-text">
            Thank you. Your message has been received. We aim to respond within 2–3 business days.
          </p>
        )}

        <div className="mx-auto mt-8 grid max-w-5xl gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ContactForm
              defaultName={session?.user?.name ?? ""}
              defaultEmail={session?.user?.email ?? ""}
              isLoggedIn={Boolean(session?.user)}
            />
          </div>

          <aside className="space-y-6 lg:col-span-2">
            <div className="card-elevated p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gold">Academy contact</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted">
                {social.contactEmail && (
                  <li>
                    <span className="block font-medium text-foreground">Email</span>
                    <a href={`mailto:${social.contactEmail}`} className="break-all hover:text-gold">
                      {social.contactEmail}
                    </a>
                  </li>
                )}
                {social.whatsappNumber && (
                  <li>
                    <span className="block font-medium text-foreground">Phone / WhatsApp</span>
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gold"
                    >
                      {whatsappDisplay}
                    </a>
                  </li>
                )}
                <li>
                  <span className="block font-medium text-foreground">Location</span>
                  <a
                    href={ACADEMY_LOCATION.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1.5 font-medium text-[#1a73e8] underline decoration-[#1a73e8]/50 underline-offset-2 hover:text-[#1557b0] hover:decoration-[#1557b0]"
                  >
                    {ACADEMY_LOCATION.label}
                  </a>
                </li>
              </ul>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <iframe
                title={`${ACADEMY_LOCATION.name} on Google Maps`}
                src={getAcademyLocationEmbedUrl()}
                className="h-56 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <p className="text-sm text-muted">
              Prefer to read about us first?{" "}
              <Link href="/about" className="font-medium text-primary hover:underline">
                About Us
              </Link>
            </p>
          </aside>
        </div>
      </Section>
    </>
  );
}
