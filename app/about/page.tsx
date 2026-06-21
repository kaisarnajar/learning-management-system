import type { Metadata } from "next";
import Link from "next/link";
import { ACADEMY_LOCATION, getAcademyLocationEmbedUrl } from "@/lib/academy-location";
import { formatWhatsAppForDisplay, getSocialLinksSettings } from "@/lib/social-links";
import { SplitSectionTitle } from "@/components/site/SplitSectionTitle";
import { Source_Serif_4 } from "next/font/google";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Darse-Quran is a non-profit Sunni Islamic media group in South Asia. Learn about our mission, online academy, and contact information.",
};

const values = [
  {
    title: "Authenticity",
    description: "Teaching rooted in classical Sunni scholarship, with clarity and care for the sources of Islam.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: "Accessibility",
    description: "Online classes and resources so students worldwide can learn, with a schedule that respects daily life.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
  {
    title: "Excellence",
    description: "Structured programs, qualified teachers, and regular assessment for steady progress.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
];

export default async function AboutPage() {
  const social = await getSocialLinksSettings();
  const whatsappDisplay = formatWhatsAppForDisplay(social.whatsappNumber);

  return (
    <>
      {/* Hero Section */}
      <section className="pattern-islamic relative overflow-hidden bg-gradient-to-br from-[#003527] to-[#064e3b] px-4 py-24 sm:px-6 lg:px-8">
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50"></div>
        <div className="mx-auto max-w-4xl text-center">
          <div className="motion-safe:animate-fade-up">
            <h1 className={`${sourceSerif.className} text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl`}>
              Our Story
            </h1>
            <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-[#cca72f]"></div>
            <p className="mt-8 text-lg leading-relaxed text-white/90 sm:text-xl">
              Darse-Quran is a non-profit Sunni Islamic Media Group based in South Asia, mainly functioning in Jammu and Kashmir, aiming to spread the authentic teachings of Islam to people all over the globe.
            </p>
          </div>
        </div>
      </section>

      {/* The Mission */}
      <section className="bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center motion-safe:animate-fade-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
            <SplitSectionTitle muted="Our" accent="Mission" />
            <p className="mt-8 text-xl leading-relaxed text-muted sm:text-2xl">
              We are engaged in propagating the religion of Islam, elucidating its principles and tenets, and refuting suspicious and false allegations made against it. Our group utilizes various print and electronic means to spread the timeless message of Islam and peace.
            </p>
          </div>
        </div>
      </section>

      {/* The Academy */}
      <section className="pattern-islamic relative bg-accent-muted/30 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center motion-safe:animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
            <SplitSectionTitle muted="Darse Quran" accent="Academy" />
            <p className="mx-auto mt-6 max-w-3xl text-lg text-muted">
              The online teaching platform of Darse-Quran, offering structured, authentic Islamic education to Muslims everywhere through live classes, course enrollment, and profound learning materials.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card-elevated flex flex-col items-center p-8 text-center motion-safe:animate-fade-up" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 text-gold">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className={`${sourceSerif.className} mt-6 text-xl font-semibold text-primary`}>Structured Learning</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Our instructors guide students in Quran recitation (Nazira), memorization (Hifz), Tajweed, Arabic grammar, Islamic studies, and Seerah. Classes are generally after Isha salah.
              </p>
            </div>

            <div className="card-elevated flex flex-col items-center p-8 text-center motion-safe:animate-fade-up" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 text-gold">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className={`${sourceSerif.className} mt-6 text-xl font-semibold text-primary`}>Public Fatwa & Q&amp;A</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Beyond courses, the academy provides a public Fatwa Q&amp;A section where questions can be submitted and answered strictly according to authentic Sunni scholarship.
              </p>
            </div>

            <div className="card-elevated flex flex-col items-center p-8 text-center motion-safe:animate-fade-up" style={{ animationDelay: '750ms', animationFillMode: 'both' }}>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 text-gold">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className={`${sourceSerif.className} mt-6 text-xl font-semibold text-primary`}>Earn Certificates</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Students who complete our structured programs with the required progress will earn official completion certificates, celebrating their journey and achievements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center motion-safe:animate-fade-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
            <SplitSectionTitle muted="Our" accent="Values" />
          </div>
          <ul className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {values.map((value, index) => (
              <li 
                key={value.title} 
                className="feature-card card-elevated p-8 text-center motion-safe:animate-fade-up transition-transform hover:-translate-y-1"
                style={{ animationDelay: `${(index + 2) * 150}ms`, animationFillMode: 'both' }}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
                  {value.icon}
                </div>
                <h3 className={`${sourceSerif.className} mt-6 text-xl font-semibold text-primary`}>{value.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-muted">{value.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="pattern-islamic relative border-t border-border bg-accent-muted/10 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center motion-safe:animate-fade-up">
            <SplitSectionTitle muted="Get In" accent="Touch" />
            <p className="mt-4 text-lg text-muted">
              For course enrollment inquiries or any questions, please reach out. We aim to respond within 2–3 business days.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center space-y-8 motion-safe:animate-fade-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
              
              <div className="card-elevated flex items-start gap-4 p-6">
                <div className="flex shrink-0 items-center justify-center rounded-full bg-gold/10 p-3 text-gold">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-foreground">Email Address</h4>
                  <p className="mt-1 text-sm text-muted">
                    {social.contactEmail ? (
                      <a href={`mailto:${social.contactEmail}`} className="hover:text-gold transition-colors">{social.contactEmail}</a>
                    ) : "—"}
                  </p>
                </div>
              </div>

              <div className="card-elevated flex items-start gap-4 p-6">
                <div className="flex shrink-0 items-center justify-center rounded-full bg-gold/10 p-3 text-gold">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-foreground">Phone / WhatsApp</h4>
                  <p className="mt-1 text-sm text-muted">
                    {whatsappDisplay || "—"}
                  </p>
                </div>
              </div>

              <div className="card-elevated flex items-start gap-4 p-6">
                <div className="flex shrink-0 items-center justify-center rounded-full bg-gold/10 p-3 text-gold">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-foreground">Academy Location</h4>
                  <p className="mt-1 text-sm text-muted">
                    <a href={ACADEMY_LOCATION.mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                      {ACADEMY_LOCATION.label}
                    </a>
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <Link href="/contact" className="btn-gold-solid inline-flex px-8 py-3.5 text-sm w-full justify-center">
                  Send us a message
                </Link>
              </div>

            </div>

            <div className="motion-safe:animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
                <iframe
                  title={`${ACADEMY_LOCATION.name} on Google Maps`}
                  src={getAcademyLocationEmbedUrl()}
                  className="h-[400px] w-full border-0 lg:h-[500px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
