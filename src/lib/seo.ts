import { clientEnv } from "@/lib/env";

/**
 * URL kanonik absolut untuk sebuah rute.
 *
 * Mengapa ini ada: `alternates.canonical` yang dipasang di root layout berlaku
 * untuk SEMUA halaman yang tidak menimpanya. Sebelumnya layout memakai
 * `canonical: "/"`, sehingga `/info`, `/kategori/<slug>`, `/panduan`, dan
 * `/kontributor/<nama>` semuanya mendeklarasikan dirinya sebagai salinan
 * beranda. Akibatnya Google membuang halaman-halaman itu dari indeks dan hanya
 * menyisakan beranda — kerugian besar untuk direktori yang justru hidup dari
 * halaman detail.
 *
 * Aturannya sekarang: root layout tidak mendeklarasikan canonical sama sekali,
 * dan setiap halaman publik menyebut kanoniknya sendiri lewat fungsi ini.
 * `tests/unit/seo-canonical.test.ts` menjaga agar tidak ada halaman publik baru
 * yang lupa.
 */
export function canonicalUrl(path: string): string {
  const site = clientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (path === "" || path === "/") return site;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${site}${suffix}`;
}
