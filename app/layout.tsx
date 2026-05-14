import type { Metadata, Viewport } from "next";
import { Hind_Siliguri } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
});

export const viewport: Viewport = {
  themeColor: "#1B6B3A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "QurbaniSathi — কোরবানি সাথী | Find Qurbani Share Partners",
  description: "Find your Qurbani share partners in your neighborhood. আপনার পাড়ার মানুষের সাথে কোরবানির ভাগ মেলান।",
  manifest: "/manifest.json",
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
  openGraph: {
    title: "QurbaniSathi — কোরবানি সাথী",
    description: "Find your Qurbani share partners nearby. প্রতিবেশীর সাথে কোরবানির ভাগ মেলান।",
    type: "website",
    locale: "bn_BD",
    url: "https://qurbanisathi.com",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "QurbaniSathi",
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={hindSiliguri.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-hind bg-background text-text-primary antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
