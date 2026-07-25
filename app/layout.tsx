import type { Metadata } from "next";
import { Poppins, Amiri } from "next/font/google";
import { indoPakArabic } from "@/utils/fonts/indo-pak-arabic";
import { CartProvider } from "@/components/bookstore/CartProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const dynamic = "force-dynamic";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

import { BRAND_CONFIG } from "@/config/brand";
import { JsonLd } from "@/components/site/JsonLd";
import { PwaRegister } from "@/components/site/PwaRegister";
import { getOrganizationSchema } from "@/services/seo-schema";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND_CONFIG.websiteUrl),
  title: {
    default: BRAND_CONFIG.seo.defaultTitle,
    template: BRAND_CONFIG.seo.titleTemplate,
  },
  description: BRAND_CONFIG.seo.defaultDescription,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND_CONFIG.shortName,
  },
  keywords: [
    "Quran learning",
    "Tajweed online",
    "Islamic studies",
    "Arabic course",
    "Darse Quran",
    "Online Madrassa",
    "Quran classes",
    "Hifz course",
    "Islamic scholars",
  ],
  authors: [{ name: BRAND_CONFIG.name, url: BRAND_CONFIG.websiteUrl }],
  creator: BRAND_CONFIG.name,
  publisher: BRAND_CONFIG.name,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BRAND_CONFIG.websiteUrl,
    siteName: BRAND_CONFIG.name,
    title: BRAND_CONFIG.seo.defaultTitle,
    description: BRAND_CONFIG.seo.defaultDescription,
    images: [
      {
        url: BRAND_CONFIG.seo.openGraphImage,
        width: 1200,
        height: 630,
        alt: BRAND_CONFIG.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_CONFIG.seo.defaultTitle,
    description: BRAND_CONFIG.seo.defaultDescription,
    images: [BRAND_CONFIG.seo.openGraphImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${amiri.variable} ${indoPakArabic.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col overflow-x-hidden font-sans" suppressHydrationWarning>
        <JsonLd data={getOrganizationSchema()} />
        <PwaRegister />
        <SessionProvider>
          <ToastProvider>
            <CartProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <WhatsAppButton />
            </CartProvider>
          </ToastProvider>
        </SessionProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
