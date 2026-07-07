import Link from "next/link";
import { indoPakArabic } from "@/lib/fonts/indo-pak-arabic";
import { Source_Serif_4 } from "next/font/google";
import { BRAND_CONFIG } from "@/config/brand";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600", "700"] });

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#003527] via-teal-900 to-[#002117] text-white">
      {/* Background Overlay to match the deeper blue/emerald tone */}
      <div className="absolute inset-0 bg-[#003527]/40 mix-blend-multiply pointer-events-none" />
      
      <div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-4 py-16 sm:px-6 lg:py-24 md:flex-row md:items-center md:justify-between md:gap-16">
        
        {/* Left Side Content */}
        <div className="min-w-0 max-w-2xl shrink-0">

          <h1 className={`${sourceSerif.className} text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl`}>
            Master the Quran and <br className="hidden sm:block" />
            <span className="text-[#95d3ba]">Islamic Sciences</span> <br className="hidden sm:block" />
            with Excellence
          </h1>
          
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
            Join {BRAND_CONFIG.name} to study Quran, Tajweed, Islamic Jurisprudence, Hadith, Arabic Language, and more with qualified teachers from anywhere in the world. Embark on a journey of spiritual and intellectual growth.
          </p>
          
          <div className="mt-10">
            <Link 
              href="/courses" 
              className="inline-flex items-center justify-center rounded bg-[#cca72f] px-8 py-3.5 text-sm font-semibold text-[#4e3d00] transition-colors hover:bg-[#e9c349]"
            >
              Explore Courses
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Right Side Glass Card */}
        <div className="relative w-full max-w-md shrink-0 motion-safe:animate-float">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-[#95d3ba]/20 backdrop-blur-md">
            {/* Inner subtle glow */}
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            
            <div className="mb-6 text-center">
              <p
                lang="ar"
                dir="rtl"
                className={`${indoPakArabic.className} indo-pak-arabic text-2xl leading-relaxed text-white md:text-3xl`}
              >
                خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-widest text-white/70">
                (The best among you are those who learn the Quran and teach it)
              </p>
            </div>
            
            <div className="mb-6 h-[2px] w-12 bg-[#cca72f]"></div>
            
            <h3 className={`${sourceSerif.className} mb-6 text-2xl font-semibold text-white`}>
              Start Your Journey Today
            </h3>
            
            <div className="mb-6 h-[1px] w-full bg-white/10"></div>
            
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-[#cca72f]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium text-[#cca72f]">Connecting Hearts with the Quran</span>
            </div>
          </div>
        </div>
        
      </div>
    </section>
  );
}
