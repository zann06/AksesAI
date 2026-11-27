import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";

import { NavigationProgress } from "@/components/layout/navigation-progress";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants/labels";
import { clientEnv } from "@/lib/env";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(clientEnv().NEXT_PUBLIC_SITE_URL),
  title: {
    default: `${APP_NAME} — Direktori Info Gratis & Murah Seputar AI`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: APP_NAME,
    title: `${APP_NAME} — Direktori Info Gratis & Murah Seputar AI`,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Direktori Info Gratis & Murah Seputar AI`,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  // Sengaja TIDAK ada `alternates.canonical` di sini.
  //
  // Nilai di root layout diwarisi oleh setiap halaman yang tidak menimpanya.
  // Saat dulu diisi `canonical: "/"`, seluruh halaman publik (/info, /kategori,
  // /panduan, /kontributor) mendeklarasikan dirinya sebagai duplikat beranda
  // sehingga dibuang Google dari indeks. Setiap halaman kini memakai
  // `canonicalUrl()` dari `@/lib/seo` untuk menyebut URL-nya sendiri.
  // `metadataBase` di bawah tetap dipertahankan agar URL relatif (mis. gambar
  // Open Graph) tetap diresolusi absolut.
};

export const viewport: Viewport = {
  themeColor: "#0d6e66",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Cloudflare Web Analytics (ramah privasi, tanpa cookie): hanya dimuat
  // bila token diset — lihat README §Analytics.
  const cfBeaconToken = clientEnv().NEXT_PUBLIC_CF_BEACON_TOKEN;

  return (
    <html lang="id" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {cfBeaconToken ? (
          <Script
            strategy="afterInteractive"
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cfBeaconToken })}
          />
        ) : null}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
