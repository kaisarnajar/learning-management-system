import { ASSET_URLS } from "@/config/assets";
export type CourseCategoryIconKey =
  | "tajweed"
  | "seerah"
  | "arabic"
  | "hifz"
  | "quran"
  | "fiqh"
  | "islamic"
  | "tafsir"
  | "aqeedah"
  | "hadith"
  | "duas"
  | "other";

export type FlaticonCourseIcon = {
  key: CourseCategoryIconKey;
  label: string;
  src: string;
  iconId: number;
  slug: string;
  author: string;
  authorUrl: string;
};

const FLATICON_AUTHOR_BASE = "https://www.flaticon.com/authors";

const FLATICON_COURSE_ICONS: Record<CourseCategoryIconKey, FlaticonCourseIcon> = {
  quran: {
    key: "quran",
    label: "Quran",
    src: ASSET_URLS.icons.quran,
    iconId: 1717548,
    slug: "quran",
    author: "Freepik",
    authorUrl: `${FLATICON_AUTHOR_BASE}/freepik`,
  },
  tajweed: {
    key: "tajweed",
    label: "Tajweed",
    src: ASSET_URLS.icons.quranTajweed,
    iconId: 18947682,
    slug: "quran",
    author: "Magnific",
    authorUrl: "https://www.flaticon.com/",
  },
  hifz: {
    key: "hifz",
    label: "Hifz",
    src: ASSET_URLS.icons.tasbih,
    iconId: 19038297,
    slug: "tasbih",
    author: "Magnific",
    authorUrl: "https://www.flaticon.com/",
  },
  seerah: {
    key: "seerah",
    label: "Seerah",
    src: ASSET_URLS.icons.prophetsMosque,
    iconId: 4269431,
    slug: "the-prophets-mosque",
    author: "Freepik",
    authorUrl: `${FLATICON_AUTHOR_BASE}/freepik`,
  },
  arabic: {
    key: "arabic",
    label: "Arabic",
    src: ASSET_URLS.icons.arabicLanguage,
    iconId: 9103491,
    slug: "arabic-language",
    author: "HussainDev-Icon",
    authorUrl: `${FLATICON_AUTHOR_BASE}/hussaindev-icon`,
  },
  fiqh: {
    key: "fiqh",
    label: "Fiqh",
    src: ASSET_URLS.icons.scales,
    iconId: 1430,
    slug: "scales-of-justice",
    author: "Freepik",
    authorUrl: `${FLATICON_AUTHOR_BASE}/freepik`,
  },
  islamic: {
    key: "islamic",
    label: "Islamic Studies",
    src: ASSET_URLS.icons.kaaba,
    iconId: 19038391,
    slug: "kaaba",
    author: "Magnific",
    authorUrl: "https://www.flaticon.com/",
  },
  tafsir: {
    key: "tafsir",
    label: "Tafsir",
    src: ASSET_URLS.icons.tafsirBook,
    iconId: 17259757,
    slug: "holy-book",
    author: "Magnific",
    authorUrl: "https://www.flaticon.com/",
  },
  aqeedah: {
    key: "aqeedah",
    label: "Aqeedah",
    src: ASSET_URLS.icons.crescent,
    iconId: 7515485,
    slug: "crescent",
    author: "Freepik",
    authorUrl: `${FLATICON_AUTHOR_BASE}/freepik`,
  },
  hadith: {
    key: "hadith",
    label: "Hadith",
    src: ASSET_URLS.icons.hadist,
    iconId: 15993562,
    slug: "hadist",
    author: "Freepik",
    authorUrl: `${FLATICON_AUTHOR_BASE}/freepik`,
  },
  duas: {
    key: "duas",
    label: "Duas & Adhkar",
    src: ASSET_URLS.icons.prayingHands,
    iconId: 14900725,
    slug: "praying-hands",
    author: "Freepik",
    authorUrl: `${FLATICON_AUTHOR_BASE}/freepik`,
  },
  other: {
    key: "other",
    label: "Other",
    src: ASSET_URLS.icons.mosque,
    iconId: 10324895,
    slug: "mosque",
    author: "Freepik",
    authorUrl: `${FLATICON_AUTHOR_BASE}/freepik`,
  },
};

function getCourseCategoryIconKey(category: string): CourseCategoryIconKey {
  const normalized = category.toLowerCase();

  if (normalized.includes("tajweed")) return "tajweed";
  if (normalized.includes("seerah")) return "seerah";
  if (normalized.includes("arabic")) return "arabic";
  if (normalized.includes("hifz")) return "hifz";
  if (normalized.includes("quran")) return "quran";
  if (normalized.includes("fiqh")) return "fiqh";
  if (normalized.includes("tafsir")) return "tafsir";
  if (normalized.includes("aqeedah")) return "aqeedah";
  if (normalized.includes("hadith")) return "hadith";
  if (normalized.includes("duas") || normalized.includes("adhkar")) return "duas";
  if (normalized.includes("islamic")) return "islamic";
  return "other";
}

export function getFlaticonCourseIcon(category: string): FlaticonCourseIcon {
  const key = getCourseCategoryIconKey(category);
  return FLATICON_COURSE_ICONS[key];
}
