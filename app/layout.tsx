import type { Metadata } from "next";
import { Poppins, Amiri } from "next/font/google";
import { indoPakArabic } from "@/lib/fonts/indo-pak-arabic";
import { CartProvider } from "@/components/bookstore/CartProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
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

export const metadata: Metadata = {
  title: {
    default: "Darse Quran Academy | Online Islamic Learning",
    template: "%s | Darse Quran Academy",
  },
  description:
    "Learn Quran, Tajweed, Arabic, and Islamic studies online with qualified teachers at Darse Quran Academy.",
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
              <AnalyticsTracker />
            </CartProvider>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
