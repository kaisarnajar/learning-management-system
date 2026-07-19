import type { Metadata } from "next";
import Link from "next/link";
import { Source_Serif_4 } from "next/font/google";
import { BRAND_CONFIG } from "@/config/brand";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how Darse Quran Academy collects, uses, and protects your personal information and privacy.",
};

const privacySections = [
  {
    id: "who-we-are",
    number: "1",
    title: "Who We Are",
    content: (
      <>
        <p className="leading-relaxed text-muted">
          Darse Quran Academy is an Islamic educational and service platform providing:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-muted">
          <li>Online and offline Islamic courses</li>
          <li>Quran, Tajweed and Hifz programs</li>
          <li>Islamic Studies and educational resources</li>
          <li>Darul Ifta (Islamic Fatwa services)</li>
          <li>Islamic bookstore and related products</li>
          <li>Articles, announcements and other Islamic content</li>
          <li>Additional educational and community services introduced from time to time</li>
        </ul>
      </>
    ),
  },
  {
    id: "information-we-collect",
    number: "2",
    title: "Information We Collect",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-muted">
          Depending on the services you use, we may collect the following information:
        </p>
        <div>
          <h3 className="font-semibold text-foreground">Personal Information</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-6 text-muted">
            <li>Full name</li>
            <li>Email address</li>
            <li>Mobile or telephone number</li>
            <li>Country, state and city</li>
            <li>Parent or guardian details (where applicable)</li>
            <li>Course registration information</li>
            <li>Student records related to attendance, assessments and certificates</li>
            <li>Information submitted through contact forms or support requests</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Payment Information</h3>
          <p className="mt-1 leading-relaxed text-muted">
            Payments are processed through secure third-party payment providers. Darse Quran Academy does not store complete debit card, credit card or banking information on its own servers.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Technical Information</h3>
          <p className="mt-1 leading-relaxed text-muted">
            When you visit our website, we may automatically collect information such as IP address, browser type, device information, operating system, pages visited, date and time of access, and website usage statistics.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "how-we-use-information",
    number: "3",
    title: "How We Use Your Information",
    content: (
      <div className="space-y-2">
        <p className="font-semibold text-foreground">We use your information to:</p>
        <ul className="list-disc space-y-1.5 pl-6 text-muted">
          <li>Register students for courses and services.</li>
          <li>Deliver educational content.</li>
          <li>Process payments and confirmations.</li>
          <li>Maintain student records.</li>
          <li>Respond to inquiries and support requests.</li>
          <li>Provide Darul Ifta and other requested services.</li>
          <li>Deliver bookstore orders where applicable.</li>
          <li>Send important updates regarding classes, schedules and services.</li>
          <li>Improve our website, services and user experience.</li>
          <li>Protect the security and integrity of our platform.</li>
          <li>Comply with applicable legal obligations.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "cookies",
    number: "4",
    title: "Cookies and Similar Technologies",
    content: (
      <div className="space-y-2">
        <p className="leading-relaxed text-muted">
          Our website may use cookies and similar technologies to improve website functionality, remember user preferences, analyze traffic, and enhance user experience.
        </p>
        <p className="leading-relaxed text-muted">
          You may disable cookies through your browser settings. However, some features of the website may not function properly.
        </p>
      </div>
    ),
  },
  {
    id: "communications",
    number: "5",
    title: "Communications",
    content: (
      <div className="space-y-2">
        <p className="leading-relaxed text-muted">
          By registering with Darse Quran Academy, you consent to receive communications relating to your courses, registrations, purchases, announcements, payment confirmations and other service-related matters through email, phone calls, WhatsApp, SMS or other appropriate communication channels.
        </p>
        <p className="leading-relaxed text-muted">
          You may opt out of promotional communications at any time. However, important service-related communications may still be sent where necessary.
        </p>
      </div>
    ),
  },
  {
    id: "sharing-information",
    number: "6",
    title: "Sharing of Information",
    content: (
      <div className="space-y-3">
        <p className="leading-relaxed text-muted">
          Darse Quran Academy does not sell, rent or trade your personal information.
        </p>
        <p className="font-semibold text-foreground">Your information may be shared only where necessary:</p>
        <ul className="list-disc space-y-1.5 pl-6 text-muted">
          <li>With trusted service providers assisting in website operation, payment processing or communication.</li>
          <li>Where required by applicable law or lawful authority.</li>
          <li>To protect the rights, safety or security of Darse Quran Academy, its students, staff or users.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "data-security",
    number: "7",
    title: "Data Security",
    content: (
      <div className="space-y-2 text-muted">
        <p className="leading-relaxed">
          We take reasonable administrative, technical and organizational measures to safeguard your personal information against unauthorized access, alteration, disclosure or destruction.
        </p>
        <p className="leading-relaxed">
          While we strive to protect your information, no method of electronic storage or internet transmission is completely secure. Therefore, absolute security cannot be guaranteed.
        </p>
      </div>
    ),
  },
  {
    id: "childrens-privacy",
    number: "8",
    title: "Children's Privacy",
    content: (
      <div className="space-y-2 text-muted">
        <p className="leading-relaxed">
          Many of our services are intended for children and young students learning the Quran and Islamic studies.
        </p>
        <p className="leading-relaxed">
          Where required, parents or legal guardians should complete registration and provide the necessary information on behalf of minor students.
        </p>
        <p className="leading-relaxed">
          We collect only the information reasonably necessary to provide our educational services.
        </p>
      </div>
    ),
  },
  {
    id: "third-party-services",
    number: "9",
    title: "Third-Party Services",
    content: (
      <div className="space-y-2 text-muted">
        <p className="leading-relaxed">
          Our website may use third-party services including payment gateways, analytics providers, communication platforms, and social media integrations.
        </p>
        <p className="leading-relaxed">
          These third-party services operate under their own privacy policies, and Darse Quran Academy is not responsible for their privacy practices.
        </p>
      </div>
    ),
  },
  {
    id: "external-links",
    number: "10",
    title: "External Links",
    content: (
      <p className="leading-relaxed text-muted">
        Our website may contain links to third-party websites for the convenience of users. We do not control or endorse the privacy practices of external websites and encourage users to review their respective privacy policies.
      </p>
    ),
  },
  {
    id: "data-retention",
    number: "11",
    title: "Data Retention",
    content: (
      <div className="space-y-2 text-muted">
        <p className="leading-relaxed">
          We retain personal information only for as long as reasonably necessary to provide our services, maintain student records, comply with legal obligations, resolve disputes, and enforce our Terms &amp; Conditions.
        </p>
        <p className="leading-relaxed">
          After this period, information may be securely deleted or anonymized where appropriate.
        </p>
      </div>
    ),
  },
  {
    id: "your-rights",
    number: "12",
    title: "Your Rights",
    content: (
      <div className="space-y-2 text-muted">
        <p className="leading-relaxed">
          Subject to applicable law, you may request to access the personal information we hold about you, correct inaccurate or incomplete information, request deletion of your personal information where legally permissible, or withdraw consent for future promotional communications.
        </p>
        <p className="leading-relaxed">
          Certain requests may not be fulfilled where retention of information is required for legal, educational or administrative purposes.
        </p>
      </div>
    ),
  },
  {
    id: "changes-to-policy",
    number: "13",
    title: "Changes to This Privacy Policy",
    content: (
      <p className="leading-relaxed text-muted">
        Darse Quran Academy reserves the right to modify or update this Privacy Policy at any time. Any revised version becomes effective immediately upon publication on this website. Continued use of our website or services constitutes acceptance of the updated Privacy Policy.
      </p>
    ),
  },
  {
    id: "contact-us",
    number: "14",
    title: "Contact Us",
    content: (
      <div className="space-y-3">
        <p className="leading-relaxed text-muted">
          If you have any questions regarding this Privacy Policy or the handling of your personal information, please contact Darse Quran Academy using the contact information available on our website.
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

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#003527] via-teal-900 to-[#002117] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="pattern-islamic absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50"></div>
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full bg-brand-gold-alt/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-gold-alt border border-brand-gold-alt/20">
            Privacy &amp; Data Security
          </span>
          <h1 className={`${sourceSerif.className} mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl`}>
            Privacy Policy
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
            Commitment to Your Privacy
          </h2>
          <p className="leading-relaxed text-muted text-sm sm:text-base">
            {BRAND_CONFIG.name} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) values your privacy and is committed to protecting the personal information of our students, visitors, customers and users. This Privacy Policy explains what information we collect, how we use it, how we protect it, and the choices available to you when using our website and services.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {privacySections.map((sec) => (
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
          <p>For questions or requests regarding your personal information, please contact {BRAND_CONFIG.name}.</p>
        </div>
      </div>
    </div>
  );
}
