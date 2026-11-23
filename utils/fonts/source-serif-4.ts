import localFont from "next/font/local";

// Source Serif 4 is self-hosted instead of loaded via next/font/google:
// Google Fonts intermittently returns `/l/font?kit=…&skey=…` URLs for this
// family, which Turbopack fails to parse ("next/font/google queries have
// exactly one entry"), breaking production builds on Vercel.
// The file is the official latin-subset variable font from Google Fonts (v15).
export const sourceSerif = localFont({
  src: "../../public/fonts/source-serif-4-latin.woff2",
  weight: "200 900",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
