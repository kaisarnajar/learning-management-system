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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#003527] via-teal-900 to-[#002117] px-4 py-24 sm:px-6 lg:px-8">
        <div className="pattern-islamic absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50"></div>
        <div className="mx-auto max-w-4xl text-center">
          <div className="motion-safe:animate-fade-up">
            <h1 className={`${sourceSerif.className} text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl`}>
              Our Story
            </h1>
            <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-[#cca72f]"></div>
            <p className="mt-8 text-lg leading-relaxed text-white/90 sm:text-xl">
              Darse-Quran is a non-profit Sunni Islamic media and educational organization based in Jammu & Kashmir, South Asia. Established with the objective of spreading the authentic teachings of Islam, Darse-Quran strives to convey the message of the Holy Qur&apos;an and Sunnah to people across the globe through education, media, publications, and community engagement.
            </p>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center motion-safe:animate-fade-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
            <SplitSectionTitle muted="Our" accent="Vision & Mission" />
            <p className="mt-8 text-xl leading-relaxed text-muted font-medium">
              To become a trusted global platform for authentic Islamic knowledge, nurturing individuals and communities through education, media, and guidance rooted in the Qur&apos;an and Sunnah according to the understanding of Ahlus Sunnah wal Jama&apos;ah.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 motion-safe:animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
            <div className="card-elevated p-8">
              <h3 className={`${sourceSerif.className} text-xl font-semibold text-primary mb-4`}>Our Core Mission</h3>
              <p className="text-muted leading-relaxed">
                We are engaged in propagating the religion of Islam, elucidating its principles and tenets, addressing misconceptions, and providing well-researched responses to doubts and false allegations directed against the religion. Through various educational and media initiatives, we seek to inspire faith, understanding, peace, and positive character in society.
              </p>
            </div>
            <div className="card-elevated p-8">
              <h3 className={`${sourceSerif.className} text-xl font-semibold text-primary mb-4`}>Key Objectives</h3>
              <ul className="list-disc pl-5 space-y-2 text-muted">
                <li>To spread authentic Islamic teachings worldwide.</li>
                <li>To educate and empower Muslims through knowledge.</li>
                <li>To address misconceptions about Islam with wisdom and evidence.</li>
                <li>To promote peace, morality, and spiritual development.</li>
                <li>To provide accessible Islamic education through modern technology and traditional scholarship.</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 text-center motion-safe:animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
            <blockquote className="italic text-lg text-primary border-l-4 border-[#cca72f] pl-4 py-2 bg-accent-muted/10 rounded-r-lg">
              &quot;And who is better in speech than one who calls to Allah, does righteousness, and says, &apos;Indeed, I am of the Muslims.&apos;&quot; <br/><span className="text-sm font-semibold">— (Qur&apos;an 41:33)</span>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Initiatives & Programs */}
      <section className="relative bg-accent-muted/30 py-20 sm:py-24">
        <div className="pattern-islamic absolute inset-0 opacity-[0.03] pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center motion-safe:animate-fade-up">
            <SplitSectionTitle muted="Our" accent="Initiatives" />
            <p className="mx-auto mt-6 max-w-3xl text-lg text-muted">
              Darse-Quran actively utilizes both digital and print media, alongside educational programs, to reach a diverse audience worldwide.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Digital Media */}
            <div className="card-elevated p-8 motion-safe:animate-fade-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <h3 className={`${sourceSerif.className} text-xl font-semibold text-primary`}>Digital Media</h3>
              </div>
              <p className="text-muted mb-4">Through platforms such as Facebook, Instagram, X (Twitter), and YouTube, we regularly publish:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
                <li>Islamic lectures and reminders</li>
                <li>Educational articles and videos</li>
                <li>Qur&apos;anic reflections and teachings</li>
                <li>Question & Answer sessions</li>
                <li>Awareness campaigns on contemporary issues</li>
              </ul>
              <p className="mt-4 text-sm font-medium text-primary">Today, Darse-Quran reaches thousands of followers across various social media platforms.</p>
            </div>

            {/* Print Publications */}
            <div className="card-elevated p-8 motion-safe:animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className={`${sourceSerif.className} text-xl font-semibold text-primary`}>Print Publications</h3>
              </div>
              <p className="text-muted mb-4">We contribute to Islamic literature through articles, columns, and books published in local and international media. Notable publications include:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
                <li>Islam: Questions, Myths & Reality (Urdu & English)</li>
                <li>Radd-e-Gohar Shahiyat</li>
                <li>Qadyaniyat</li>
                <li>Who Is Mehdi?</li>
                <li>Various booklets and research publications</li>
              </ul>
            </div>

            {/* Educational Services */}
            <div className="card-elevated p-8 motion-safe:animate-fade-up" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                </div>
                <h3 className={`${sourceSerif.className} text-xl font-semibold text-primary`}>Educational Academy</h3>
              </div>
              <p className="text-muted mb-4">Darse-Quran Academy is our dedicated institution for providing quality Islamic learning online and offline. Courses include:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
                <li>Qur&apos;an Reading & Tajweed</li>
                <li>Hifz-ul-Qur&apos;an</li>
                <li>Seerah Studies & Islamic Beliefs</li>
                <li>Youth Development Programs</li>
                <li>Specialized Islamic Courses</li>
              </ul>
              <p className="mt-4 text-sm font-medium text-primary">Alhamdulillah, over 400 students have enrolled in various courses.</p>
            </div>

            {/* Events & Community */}
            <div className="card-elevated p-8 motion-safe:animate-fade-up" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className={`${sourceSerif.className} text-xl font-semibold text-primary`}>Community Programs</h3>
              </div>
              <p className="text-muted mb-4">We regularly organize events to engage and educate the community, often in collaboration with scholars from prestigious institutions like Darul Uloom Deoband:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
                <li>Islamic conferences and seminars</li>
                <li>Educational workshops</li>
                <li>Live discussion programs</li>
                <li>Question & Answer sessions</li>
                <li>Community awareness campaigns</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership & Contributors */}
      <section className="bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center motion-safe:animate-fade-up">
            <SplitSectionTitle muted="Our" accent="Foundation" />
            <p className="mx-auto mt-6 max-w-3xl text-lg text-muted">
              Founded by Talib Ul Islam and established under the supervision of distinguished scholars.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card-elevated p-8 motion-safe:animate-fade-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
              <h3 className={`${sourceSerif.className} text-xl font-semibold text-primary mb-4`}>Guidance & Supervision</h3>
              <p className="text-sm text-muted mb-4">Our scholarly guidance shapes the vision and direction of the organization:</p>
              <ul className="space-y-3 text-sm text-muted">
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-0.5">•</span>
                  <span><strong>Mufti Muzaffar Hussain Qasmi</strong><br/><span className="opacity-80">Shaykh-ul-Hadith, Darul Uloom Sopore</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-0.5">•</span>
                  <span><strong>Mufti Sultan Ahmad Qasmi</strong><br/><span className="opacity-80">Shaykh-ul-Hadith & Head Mufti, Siraj-ul-Uloom Srinagar</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-0.5">•</span>
                  <span><strong>Qazi Muhammad Imran</strong><br/><span className="opacity-80">Shaykh-ul-Hadith, Darul Uloom Bilalya</span></span>
                </li>
              </ul>
            </div>

            <div className="card-elevated p-8 motion-safe:animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <h3 className={`${sourceSerif.className} text-xl font-semibold text-primary mb-4`}>Executive Committee</h3>
              <p className="text-sm text-muted mb-4">The growth of Darse-Quran is supported by dedicated individuals and volunteers:</p>
              <ul className="grid grid-cols-2 gap-2 text-sm text-muted">
                <li>• Rayees Ah Magray</li>
                <li>• Huzaif-ul-Riyaz</li>
                <li>• Moazim Riyaz</li>
                <li>• Hafiz Abdul Basit</li>
                <li>• Mufti Shakeel Ah Qasmi</li>
                <li>• Mufti Adil Ahmad Jamie</li>
                <li>• Mufti Asif Ah Qasmi</li>
                <li>• Many other well-wishers</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 card-elevated p-8 text-center motion-safe:animate-fade-up" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
             <h3 className={`${sourceSerif.className} text-xl font-semibold text-primary mb-4`}>Website Development</h3>
             <p className="text-sm text-muted max-w-3xl mx-auto">
              The idea of establishing the Darse-Quran website was proposed by Brother Kaisar Ahmad Najar, who developed and maintained the website with remarkable dedication and professionalism. His efforts were generously supported by Brother Barkat Bashir Malik. We pray that Allah Almighty accepts their services and grants them abundant rewards in this world and the Hereafter.
             </p>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="bg-accent-muted/10 py-20 sm:py-24 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center motion-safe:animate-fade-up">
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
      <section id="contact" className="relative border-t border-border bg-surface py-20 sm:py-24">
        <div className="pattern-islamic absolute inset-0 opacity-[0.03] pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
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
