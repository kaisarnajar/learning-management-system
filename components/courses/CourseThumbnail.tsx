import { CourseCategoryIcon } from "./CourseCategoryIcon";
import { BRAND_CONFIG } from "@/config/brand";

type CourseThumbnailProps = {
  category: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

type ColorConfig = {
  glowColor: string;
  ringColor: string;
};

const CATEGORY_COLORS: Record<string, ColorConfig> = {
  quran: { glowColor: "rgba(13, 148, 136, 0.45)", ringColor: "border-teal-500/30" },
  tajweed: { glowColor: "rgba(13, 148, 136, 0.45)", ringColor: "border-teal-500/30" }, // Unified Quranic color scheme
  hifz: { glowColor: "rgba(13, 148, 136, 0.45)", ringColor: "border-teal-500/30" }, // Unified Quranic color scheme
  tafsir: { glowColor: "rgba(217, 119, 6, 0.45)", ringColor: "border-amber-500/30" },
  hadith: { glowColor: "rgba(217, 119, 6, 0.45)", ringColor: "border-amber-500/30" },
  seerah: { glowColor: "rgba(99, 102, 241, 0.45)", ringColor: "border-indigo-500/30" },
  islamic: { glowColor: "rgba(99, 102, 241, 0.45)", ringColor: "border-indigo-500/30" },
  arabic: { glowColor: "rgba(2, 132, 199, 0.45)", ringColor: "border-sky-500/30" },
  fiqh: { glowColor: "rgba(79, 70, 229, 0.45)", ringColor: "border-violet-500/30" },
  aqeedah: { glowColor: "rgba(244, 63, 94, 0.45)", ringColor: "border-rose-500/30" },
  duas: { glowColor: "rgba(16, 185, 129, 0.45)", ringColor: "border-emerald-500/30" },
  other: { glowColor: "rgba(100, 116, 139, 0.4)", ringColor: "border-slate-500/30" },
};

function getCategoryColor(category: string): ColorConfig {
  const normalized = category.toLowerCase();
  if (normalized.includes("tajweed")) return CATEGORY_COLORS.tajweed;
  if (normalized.includes("seerah")) return CATEGORY_COLORS.seerah;
  if (normalized.includes("arabic")) return CATEGORY_COLORS.arabic;
  if (normalized.includes("hifz")) return CATEGORY_COLORS.hifz;
  if (normalized.includes("quran")) return CATEGORY_COLORS.quran;
  if (normalized.includes("fiqh")) return CATEGORY_COLORS.fiqh;
  if (normalized.includes("tafsir")) return CATEGORY_COLORS.tafsir;
  if (normalized.includes("aqeedah")) return CATEGORY_COLORS.aqeedah;
  if (normalized.includes("hadith")) return CATEGORY_COLORS.hadith;
  if (normalized.includes("duas") || normalized.includes("adhkar")) return CATEGORY_COLORS.duas;
  if (normalized.includes("islamic")) return CATEGORY_COLORS.islamic;
  return CATEGORY_COLORS.other;
}

export function CourseThumbnail({
  category,
  size = "md",
  className = "",
}: CourseThumbnailProps) {
  const colors = getCategoryColor(category);

  // Layout styles depending on requested size
  const heightClass = {
    sm: "h-20",
    md: "h-32",
    lg: "h-40 sm:h-48",
  }[size];

  const ringSizeClass = {
    sm: "h-12 w-12 border",
    md: "h-20 w-20 border-2",
    lg: "h-28 w-28 border-[3px]",
  }[size];

  const innerIconSize = {
    sm: "sm",
    md: "md",
    lg: "lg",
  }[size] as "sm" | "md" | "lg";

  return (
    <div
      className={`relative w-full overflow-hidden bg-surface-dark flex items-center justify-center transition-colors duration-300 ${heightClass} ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle at center, ${colors.glowColor} 0%, rgba(10, 18, 20, 1) 85%)`,
      }}
    >
      {/* Decorative Islamic Geometric Pattern Overlay */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.06] pointer-events-none select-none mix-blend-overlay"
        xmlns="http://www.w3.org/2000/svg"
        width="60"
        height="60"
        viewBox="0 0 60 60"
      >
        <pattern id="islamic-grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M0 0 L60 60 M60 0 L0 60" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
          <circle cx="30" cy="30" r="10" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="30" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="0" cy="0" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="60" cy="0" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="0" cy="60" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="60" cy="60" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#islamic-grid)" className="text-gold" />
      </svg>

      {/* Decorative Glow Dot Pattern */}
      <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Unified Halo Outer Container */}
      <div
        className={`flex items-center justify-center rounded-full border-gold/25 bg-black/45 backdrop-blur-md shadow-gold-glow ${ringSizeClass} ${colors.ringColor} z-10 transition-transform hover:scale-105`}
      >
        {/* Dynamic Category Icon centered */}
        <CourseCategoryIcon category={category} size={innerIconSize} />
      </div>

      {/* Elegant Header Text Badge (Only for medium & large banners) */}
      {size !== "sm" && (
        <span className="absolute top-3 left-4 text-ui-micro font-semibold tracking-[0.25em] text-gold/45 uppercase select-none pointer-events-none">
          {BRAND_CONFIG.name}
        </span>
      )}
    </div>
  );
}
