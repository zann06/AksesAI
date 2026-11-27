import type { NextConfig } from "next";

/**
 * Security headers (docs/SECURITY.md §8).
 *
 * CSP memakai `'unsafe-inline'` untuk script karena Next.js App Router
 * meng-inline bootstrap script; nonce per-request membutuhkan middleware CSP
 * yang memaksa semua halaman dinamis (bertentangan dengan ISR halaman publik).
 * Compensating controls: tidak ada `dangerouslySetInnerHTML` untuk konten
 * pengguna dan `script-src` dibatasi ke 'self' + domain Turnstile.
 */
const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' https://avatars.githubusercontent.com data: blob:",
      // `'unsafe-eval'` HANYA di development: React memakai `eval()` untuk
      // merekonstruksi callstack (Fast Refresh & pesan error). Tanpa ini dev
      // server mencetak peringatan berulang dan debugging jadi sulit.
      // Production tetap tanpa `'unsafe-eval'`.
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com"
        : "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      // Tidak ada direktif `form-action` secara sengaja.
      // Chromium menerapkannya pada URL di header `Location` dari respons POST,
      // bukan hanya tujuan form. Alur login memakai POST /auth/sign-in yang
      // merespons 303 ke Supabase → dengan `form-action 'self'` redirect itu
      // diblokir dan tombol "Lanjutkan dengan GitHub" tampak mati (bug nyata
      // yang terdeteksi lewat uji Playwright). Semua redirect OAuth tetap
      // berasal dari server (allowlist `next` + `redirectTo`), sehingga
      // CSRF login tidak bergantung pada direktif ini.
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // --- Isolasi proses (defense-in-depth) ---
  //
  // COOP `same-origin` memutus akses `window.opener` dari tab lain, sehingga
  // halaman ini tidak bisa dipakai sebagai "topeng" untuk mengendalikan tab
  // korban (tab-nabbing). Aman untuk alur login di repo ini karena
  // `/auth/sign-in` memakai redirect 303 di tab yang sama, bukan popup —
  // popup-lah yang bergantung pada `window.opener`.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // CORP mencegah sumber daya kita (HTML, gambar, JSON) dipakai silang-origin
  // oleh situs lain, mis. gambar avatar atau respons API yang ditempel ke
  // halaman penyerang.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Menutup jalur lama Flash/PDF yang membaca kebijakan cross-domain.
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
