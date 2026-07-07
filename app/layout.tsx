import type { Metadata } from "next";
import { Poppins, Amiri } from "next/font/google";
import { indoPakArabic } from "@/utils/fonts/indo-pak-arabic";
import { CartProvider } from "@/components/bookstore/CartProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
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

export const metadata: Metadata = {
  title: {
    default: BRAND_CONFIG.seo.defaultTitle,
    template: BRAND_CONFIG.seo.titleTemplate,
  },
  description: BRAND_CONFIG.seo.defaultDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${amiri.variable} ${indoPakArabic.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col overflow-x-hidden font-sans" suppressHydrationWarning>
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
      </body>
    </html>
  );
}
