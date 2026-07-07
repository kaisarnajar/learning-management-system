import path from "path";

/**
 * Client-side URLs for rendering images in the browser via next/image or <img />.
 */
export const ASSET_URLS = {
  logo: "/assets/logo.png",
  signature: "/assets/signature.png",
  stamp: "/assets/stamp.png",
  favicon: "/favicon.ico",
  icons: {
    quran: "/icons/flaticon/course-categories/quran.png",
    quranTajweed: "/icons/flaticon/course-categories/quran-tajweed.png",
    tasbih: "/icons/flaticon/course-categories/tasbih.png",
    prophetsMosque: "/icons/flaticon/course-categories/prophets-mosque.png",
    arabicLanguage: "/icons/flaticon/course-categories/arabic-language.png",
    scales: "/icons/flaticon/course-categories/scales.png",
    kaaba: "/icons/flaticon/course-categories/kaaba.png",
    tafsirBook: "/icons/flaticon/course-categories/tafsir-book.png",
    crescent: "/icons/flaticon/course-categories/crescent.png",
    hadist: "/icons/flaticon/course-categories/hadist.png",
    prayingHands: "/icons/flaticon/course-categories/praying-hands.png",
    mosque: "/icons/flaticon/course-categories/mosque.png",
  }
};

/**
 * Server-side absolute file paths for local file reading.
 * Used exclusively by PDF generators and server actions.
 */
export const ASSET_LOCAL_PATHS = {
  logo: path.join(process.cwd(), "public", "assets", "logo.png"),
  signature: path.join(process.cwd(), "public", "assets", "signature.png"),
  stamp: path.join(process.cwd(), "public", "assets", "stamp.png"),
};
