export type BrandAssets = {
  logoUrl: string;
  faviconUrl: string;
  defaultImage: string;
  emailLogoUrl?: string;
  pdfLogoUrl?: string;
};

export type BrandContact = {
  email: string;
  phone: string;
  whatsapp: string;
  whatsappDefaultMessage: string;
  address: string;
};

export type BrandSocial = {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  twitter?: string;
};

export type BrandSEO = {
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  openGraphImage: string;
};

export type BrandContent = {
  arabicVerse?: string;
  arabicVerseTranslation?: string;
};

export type BrandFooter = {
  text: string;
  copyrightText: string;
  description: string;
};

export type BrandConfig = {
  name: string;
  arabicName?: string;
  shortName: string;
  websiteUrl: string;
  assets: BrandAssets;
  contact: BrandContact;
  social: BrandSocial;
  seo: BrandSEO;
  content: BrandContent;
  footer: BrandFooter;
};

export const BRAND_CONFIG: BrandConfig = {
  name: "Darse Quran Academy",
  arabicName: "دار القرآن الكريم", // Placeholder if we had one
  shortName: "DQA",
  websiteUrl: "https://darsequranacademy.com",
  
  assets: {
    logoUrl: "/assets/logo.png",
    faviconUrl: "/favicon.ico",
    defaultImage: "/assets/logo.png",
  },
  
  contact: {
    email: "darsequraann@gmail.com",
    phone: "+919622966911", // General phone, fallback to whatsapp
    whatsapp: "919622966911",
    whatsappDefaultMessage: "Assalamu Alaikum, I would like to know more about Darse Quran Academy.",
    address: "Treran Tangmarg, Baramulla J&K 193402",
  },
  
  social: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    youtube: "https://youtube.com",
  },
  
  seo: {
    defaultTitle: "Darse Quran Academy | Online Islamic Learning",
    titleTemplate: "%s | Darse Quran Academy",
    defaultDescription: "Learn Quran, Tajweed, Arabic, and Islamic studies online with qualified teachers at Darse Quran Academy.",
    openGraphImage: "/assets/logo.png",
  },
  
  content: {
    arabicVerse: "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ",
    arabicVerseTranslation: "Read in the name of your Lord who created",
  },
  
  footer: {
    text: "Serving students worldwide",
    copyrightText: `© ${new Date().getFullYear()} Darse Quran Academy. All rights reserved.`,
    description: "Dedicated to authentic Islamic education—Quran, Arabic, and Islamic studies for all ages, taught online by qualified scholars.",
  }
};
