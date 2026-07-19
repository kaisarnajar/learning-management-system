import type { Metadata } from "next";
import Link from "next/link";
import { Source_Serif_4 } from "next/font/google";
import { BRAND_CONFIG } from "@/config/brand";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Read the Terms & Conditions for accessing and using Darse Quran Academy services, courses, publications, and platform.",
};

const termsSections = [
  {
    id: "about-us",
    number: "1",
    title: "About Us",
    content: (
      <>
        <p className="leading-relaxed text-muted">
          Darse Quran Academy is an Islamic educational and service platform dedicated to promoting authentic Islamic knowledge. Our services may include, but are not limited to:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-muted">
          <li>Online and offline Islamic courses</li>
          <li>Quran, Tajweed and Hifz programs</li>
          <li>Islamic Studies, Aqeedah, Fiqh and related educational courses</li>
          <li>Darul Ifta (Islamic Fatwa services)</li>
          <li>Islamic bookstore and educational resources</li>
          <li>Islamic articles, lectures, announcements and publications</li>
          <li>Community initiatives and other services introduced by the Academy from time to time</li>
        </ul>
      </>
    ),
  },
  {
    id: "eligibility",
    number: "2",
    title: "Eligibility",
    content: (
      <>
        <p className="leading-relaxed text-muted">
          Our services are open to all eligible individuals.
        </p>
        <p className="mt-2 leading-relaxed text-muted">
          Where required by applicable law, registrations for minors should be completed by a parent or legal guardian.
        </p>
      </>
    ),
  },
  {
    id: "registration",
    number: "3",
    title: "Registration",
    content: (
      <ul className="list-disc space-y-2 pl-6 text-muted">
        <li>Registration for any course or service is subject to availability and approval by Darse Quran Academy.</li>
        <li>The Academy reserves the right to accept, reject, suspend or cancel any registration or account at its sole discretion.</li>
        <li>Providing false, incomplete or misleading information may result in cancellation of registration without prior notice.</li>
      </ul>
    ),
  },
  {
    id: "course-fees",
    number: "4",
    title: "Course Fees",
    content: (
      <ul className="list-disc space-y-2 pl-6 text-muted">
        <li>Some of our courses and services are offered free of charge, while others require payment.</li>
        <li>Applicable fees will be displayed before registration or purchase.</li>
        <li>Darse Quran Academy reserves the right to revise fees for future courses, batches or services without prior notice.</li>
      </ul>
    ),
  },
  {
    id: "payment-policy",
    number: "5",
    title: "Payment Policy",
    content: (
      <ul className="list-disc space-y-2 pl-6 text-muted">
        <li>Enrollment in paid courses is confirmed only after successful receipt of payment.</li>
        <li>Students are responsible for providing accurate payment information.</li>
        <li>Technical issues with banks or payment providers do not guarantee reservation of a seat unless payment is successfully completed.</li>
      </ul>
    ),
  },
  {
    id: "refund-policy",
    number: "6",
    title: "Refund Policy",
    content: (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
          <p className="font-semibold text-foreground">Default Standard Policy:</p>
          <p className="mt-1 leading-relaxed text-muted">
            All payments made to Darse Quran Academy are, by default, strictly <strong className="text-foreground">NON-REFUNDABLE</strong> unless a particular course or service is explicitly marked as &quot;Refundable.&quot;
          </p>
        </div>
        <p className="leading-relaxed text-muted">
          Where a course or service is specifically identified as refundable, refunds shall be governed by the refund policy stated for that particular course or service.
        </p>
        <p className="leading-relaxed text-muted">
          If Darse Quran Academy cancels a paid course before it begins, the Academy shall have the sole and absolute discretion to determine the appropriate resolution. This may include, but is not limited to:
        </p>
        <ul className="list-disc space-y-1 pl-6 text-muted">
          <li>Issuing a full or partial refund;</li>
          <li>Transferring the payment to another course, batch or service;</li>
          <li>Providing an alternative arrangement; or</li>
          <li>Any other resolution deemed appropriate by the Academy.</li>
        </ul>
        <p className="font-medium text-foreground">
          The decision of Darse Quran Academy regarding refunds or alternative arrangements shall be final.
        </p>
      </div>
    ),
  },
  {
    id: "student-conduct",
    number: "7",
    title: "Student Conduct",
    content: (
      <div className="space-y-3">
        <p className="leading-relaxed text-muted">
          Students are expected to uphold Islamic manners, respect teachers and fellow students, and maintain appropriate behaviour at all times.
        </p>
        <p className="font-semibold text-foreground">The following conduct is strictly prohibited:</p>
        <ul className="list-disc space-y-2 pl-6 text-muted">
          <li>Abusive, offensive or inappropriate language.</li>
          <li>Harassment or disrespect towards teachers, staff or fellow students.</li>
          <li>Intentional disruption of classes or Academy activities.</li>
          <li>Sharing, copying or distributing Academy materials without permission.</li>
          <li>Any behaviour considered harmful to the Academy or its learning environment.</li>
        </ul>
        <p className="text-sm font-medium text-destructive-text">
          Violation of these standards may result in suspension or permanent removal without refund, where applicable.
        </p>
      </div>
    ),
  },
  {
    id: "attendance",
    number: "8",
    title: "Attendance",
    content: (
      <ul className="list-disc space-y-2 pl-6 text-muted">
        <li>Students are expected to attend classes regularly and punctually.</li>
        <li>Students who repeatedly remain absent, miss multiple classes without prior permission or a valid reason, or remain inactive for an extended period may be removed from the batch without further notice.</li>
        <li>Any decision regarding restoration of access, re-enrollment or continuation in the course shall be entirely at the sole discretion of Darse Quran Academy. The Academy is under no obligation to restore access after removal.</li>
      </ul>
    ),
  },
  {
    id: "termination",
    number: "9",
    title: "Termination of Services",
    content: (
      <p className="leading-relaxed text-muted">
        Darse Quran Academy reserves the right to suspend or permanently terminate any user&apos;s access to its website, courses or services at any time if the user violates these Terms & Conditions or engages in conduct that the Academy reasonably considers harmful to its students, staff, reputation or operations. Such action may be taken without prior notice, and no refund shall be due unless expressly approved by the Academy.
      </p>
    ),
  },
  {
    id: "certificates",
    number: "10",
    title: "Certificates",
    content: (
      <p className="leading-relaxed text-muted">
        Certificates, where applicable, shall only be awarded to students who successfully satisfy all requirements determined by Darse Quran Academy, including attendance, assessments, assignments and any other applicable criteria.
      </p>
    ),
  },
  {
    id: "intellectual-property",
    number: "11",
    title: "Intellectual Property",
    content: (
      <div className="space-y-2 text-muted">
        <p className="leading-relaxed">
          All website content, course materials, books, PDFs, articles, videos, graphics, logos, software, recordings and educational resources are the exclusive intellectual property of Darse Quran Academy unless otherwise stated.
        </p>
        <p className="leading-relaxed">
          No material may be copied, reproduced, recorded, published, sold, redistributed or otherwise used without prior written permission from the Academy.
        </p>
      </div>
    ),
  },
  {
    id: "website-usage",
    number: "12",
    title: "Website Usage",
    content: (
      <div className="space-y-2">
        <p className="font-semibold text-foreground">Users agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-6 text-muted">
          <li>Attempt unauthorized access to the website or its systems.</li>
          <li>Upload malicious software or harmful code.</li>
          <li>Misuse website forms or Academy services.</li>
          <li>Interfere with the normal operation or security of the website.</li>
          <li>Use the website for any unlawful purpose.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "third-party-services",
    number: "13",
    title: "Third-Party Services",
    content: (
      <p className="leading-relaxed text-muted">
        Our website may integrate third-party services such as payment gateways, communication platforms, analytics providers and similar services. Use of such services is governed by their respective terms and privacy policies.
      </p>
    ),
  },
  {
    id: "disclaimer",
    number: "14",
    title: "Disclaimer",
    content: (
      <div className="space-y-2 text-muted">
        <p className="leading-relaxed">
          Darse Quran Academy makes reasonable efforts to ensure that the information and educational content provided through its website and services are accurate and beneficial.
        </p>
        <p className="leading-relaxed">
          However, the Academy does not guarantee uninterrupted website availability, error-free operation or continuous access to its services.
        </p>
        <p className="leading-relaxed">
          Educational content and Fatwa services are provided for guidance and learning purposes. Users remain responsible for applying such guidance appropriately to their individual circumstances.
        </p>
      </div>
    ),
  },
  {
    id: "limitation-of-liability",
    number: "15",
    title: "Limitation of Liability",
    content: (
      <p className="leading-relaxed text-muted">
        To the maximum extent permitted by applicable law, Darse Quran Academy shall not be liable for any direct, indirect, incidental, consequential or special damages arising from the use of its website, products or services.
      </p>
    ),
  },
  {
    id: "changes-to-terms",
    number: "16",
    title: "Changes to These Terms",
    content: (
      <p className="leading-relaxed text-muted">
        Darse Quran Academy reserves the right to modify, update or replace these Terms & Conditions at any time without prior notice. Any revised version becomes effective immediately upon publication on this website. Continued use of the website or services constitutes acceptance of the updated Terms.
      </p>
    ),
  },
  {
    id: "contact-us",
    number: "17",
    title: "Contact Us",
    content: (
      <div className="space-y-3">
        <p className="leading-relaxed text-muted">
          If you have any questions regarding these Terms & Conditions, please contact Darse Quran Academy using the contact details provided on our website.
        </p>
        <div className="pt-2">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2 text-sm font-semibold text-primary shadow-sm hover:border-brand-gold-alt hover:text-brand-gold-alt transition-colors"
          >
            Go to Contact Page &rarr;
          </Link>
        </div>
      </div>
    ),
  },
];

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#003527] via-teal-900 to-[#002117] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="pattern-islamic absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50"></div>
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full bg-brand-gold-alt/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-gold-alt border border-brand-gold-alt/20">
            Legal Agreement
          </span>
          <h1 className={`${sourceSerif.className} mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl`}>
            Terms &amp; Conditions
          </h1>
          <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-brand-gold-alt"></div>
          <p className="mt-4 text-sm text-white/80 sm:text-base">
            Effective Date: <strong className="text-white">April 4, 2026</strong>
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Preamble Card */}
        <div className="card-elevated p-6 sm:p-8 mb-10 border-l-4 border-l-brand-gold-alt">
          <h2 className={`${sourceSerif.className} text-xl font-bold text-foreground mb-3`}>
            Welcome to {BRAND_CONFIG.name}
          </h2>
          <p className="leading-relaxed text-muted text-sm sm:text-base">
            By accessing or using our website, registering for any of our courses or services, purchasing products, requesting Fatwa services, or otherwise using our platform, you agree to be bound by these Terms &amp; Conditions. If you do not agree with any part of these Terms, please do not use our website or services.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {termsSections.map((sec) => (
            <article
              key={sec.id}
              id={sec.id}
              className="card-elevated p-6 sm:p-8 scroll-mt-24 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {sec.number}
                </span>
                <div className="flex-1">
                  <h2 className={`${sourceSerif.className} text-xl font-bold text-foreground mb-4`}>
                    {sec.title}
                  </h2>
                  <div className="text-sm sm:text-base text-muted">
                    {sec.content}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-xs text-muted">
          <p>Last updated on April 4, 2026. For questions or clarification, contact {BRAND_CONFIG.name}.</p>
        </div>
      </div>
    </div>
  );
}
