import localFont from "next/font/local";

/** Indo-Pak Nastaleeq — script style used in South Asian printed Qurans */
export const indoPakArabic = localFont({
  src: "../../public/fonts/indopak-nastaleeq.woff2",
  display: "swap",
  variable: "--font-indo-pak",
  weight: "400",
});
