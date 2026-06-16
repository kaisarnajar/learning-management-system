import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { CartProvider } from "@/components/bookstore/CartProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { TopBar } from "@/components/site/TopBar";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import "./globals.css";

export const dynamic = "force-dynamic";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={`${poppins.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col overflow-x-hidden font-sans" suppressHydrationWarning>
        <SessionProvider>
          <CartProvider>
            <TopBar />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <WhatsAppButton />
          </CartProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
