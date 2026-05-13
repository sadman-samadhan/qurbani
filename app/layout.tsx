import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
});

export const metadata: Metadata = {
  title: "QurbaniSathi — কোরবানি সাথী | Find Qurbani Share Partners",
  description: "Find your Qurbani share partners in your neighborhood. আপনার পাড়ার মানুষের সাথে কোরবানির ভাগ মেলান।",
  manifest: "/manifest.json",
  themeColor: "#1B6B3A",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={hindSiliguri.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-hind bg-background text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
