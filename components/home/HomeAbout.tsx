import Link from "next/link";
import { Source_Serif_4 } from "next/font/google";
import { BRAND_CONFIG } from "@/config/brand";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"] });

export function HomeAbout() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#003527] via-teal-900 to-[#002117] py-20 sm:py-24">
      {/* Decorative Islamic Pattern Overlay */}
      <div className="pattern-islamic absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" />
      
      {/* Gold top and bottom borders */}
      <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#cca72f]/0 via-[#cca72f] to-[#cca72f]/0 opacity-50" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <div className="motion-safe:animate-fade-up">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 text-gold shadow-inner ring-1 ring-gold/20">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          
          <h2 className={`${sourceSerif.className} text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl`}>
            About <span className="text-gold">Us</span>
          </h2>
          
          <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-brand-gold-alt"></div>
          
          <p className="mt-8 text-base leading-relaxed text-white/90 sm:text-lg md:text-xl">
            Darse-Quran is a non-profit Sunni Islamic media group based in South Asia, serving from Jammu
            and Kashmir to spread the teaching of Islam worldwide through sound scholarship and da&apos;wah.
          </p>
          <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
            {BRAND_CONFIG.name} is our online platform for structured Quran and Islamic studies—with
            qualified teachers, classes are generally after Isha salah, and structured progress through each course.
          </p>
          
          <div className="mt-10">
            <Link
              href="/about"
              className="btn-gold-solid inline-flex px-8 py-3.5 text-sm md:text-base shadow-xl shadow-black/20"
            >
              Read More
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
