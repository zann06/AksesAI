import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { canonicalUrl } from "@/lib/seo";

/**
 * Penjaga regresi SEO kanonik.
 *
 * Bug yang dicegah: `alternates.canonical` pernah dipasang sekali di root
 * layout dengan nilai `"/"`. Nilai itu diwarisi SEMUA halaman yang tidak
 * menimpanya, sehingga `/info`, `/kategori/<slug>`, `/panduan`,
 * `/tentang`, `/ketentuan-penggunaan`, `/kebijakan-privasi`, dan
 * `/kontributor/<nama>` semuanya mendeklarasikan dirinya sebagai salinan
 * beranda. Google membuang halaman yang mengaku duplikat, jadi seluruh
 * direktori bisa hilang dari hasil pencarian meski sitemap-nya benar.
 *
 * Tes ini membaca berkas sumber langsung supaya halaman publik baru yang lupa
 * menyebut kanoniknya sendiri langsung ketahuan.
 */

const ROOT = join(__dirname, "..", "..");

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

/**
 * Buang komentar sebelum memeriksa kode.
 *
 * Tanpa ini, tes akan menangkap kata "canonical" di dalam komentar penjelas
 * (justru komentar yang mendokumentasikan bug lama) dan memberi hasil palsu.
 */
function readCode(relativePath: string): string {
  return read(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Halaman publik yang WAJIB punya canonical sendiri. */
const HALAMAN_PUBLIK: Array<{ path: string; berkas: string }> = [
  { path: "/", berkas: "src/app/(public)/page.tsx" },
  { path: "/info", berkas: "src/app/(public)/info/page.tsx" },
  { path: "/panduan", berkas: "src/app/(public)/panduan/page.tsx" },
  { path: "/tentang", berkas: "src/app/(public)/tentang/page.tsx" },
  {
    path: "/ketentuan-penggunaan",
    berkas: "src/app/(public)/ketentuan-penggunaan/page.tsx",
  },
  { path: "/kebijakan-privasi", berkas: "src/app/(public)/kebijakan-privasi/page.tsx" },
  { path: "/kategori/<slug>", berkas: "src/app/(public)/kategori/[slug]/page.tsx" },
  {
    path: "/kontributor/<username>",
    berkas: "src/app/(public)/kontributor/[username]/page.tsx",
  },
  { path: "/info/<slug>", berkas: "src/app/(public)/info/[slug]/page.tsx" },
];

describe("SEO — canonical per halaman", () => {
  it("root layout TIDAK mendeklarasikan canonical (agar tidak diwarisi semua halaman)", () => {
    const layout = readCode("src/app/layout.tsx");
    expect(layout).not.toMatch(/canonical\s*:/);
  });

  it.each(HALAMAN_PUBLIK)("$path menyebut kanoniknya sendiri", ({ berkas }) => {
    const isi = readCode(berkas);
    // Boleh lewat helper `canonicalUrl(...)` atau template `${site}/...`.
    const punyaKanonik =
      /canonical:\s*canonicalUrl\(/.test(isi) || /canonical:\s*`/.test(isi);
    expect(punyaKanonik).toBe(true);
  });

  it("canonicalUrl menghasilkan URL absolut tanpa garis miring ganda", () => {
    const beranda = canonicalUrl("/");
    expect(beranda).not.toMatch(/\/$/);
    expect(canonicalUrl("/info")).toBe(`${beranda}/info`);
    expect(canonicalUrl("info")).toBe(`${beranda}/info`);
    // Garis miring di akhir NEXT_PUBLIC_SITE_URL tidak boleh menghasilkan "//".
    expect(canonicalUrl("/info")).not.toMatch(/[^:]\/\//);
  });

  it("setiap halaman publik memakai jalur yang benar, bukan selalu beranda", () => {
    // Inti bug lama: semua halaman menunjuk ke "/". Pastikan tidak ada lagi
    // halaman selain beranda yang memakai canonicalUrl("/").
    for (const { path, berkas } of HALAMAN_PUBLIK) {
      if (path === "/") continue;
      const isi = readCode(berkas);
      expect(isi, `${berkas} masih menunjuk ke beranda`).not.toMatch(
        /canonical:\s*canonicalUrl\("\/"\)/,
      );
    }
  });
});

describe("SEO — sitemap mencakup semua rute publik", () => {
  const sitemap = readCode("src/app/sitemap.ts");

  it("memuat entri program", () => {
    expect(sitemap).toMatch(/listPublicProgramPaths/);
  });

  it("memuat halaman kategori", () => {
    expect(sitemap).toMatch(/getCategories/);
    expect(sitemap).toMatch(/\/kategori\//);
  });

  it("memuat halaman kontributor", () => {
    expect(sitemap).toMatch(/listPublicContributorPaths/);
    expect(sitemap).toMatch(/\/kontributor\//);
  });
});

describe("SEO — robots.txt tidak memblokir rute publik", () => {
  it("hanya memblokir area privat", () => {
    const robots = readCode("src/app/robots.ts");
    for (const privat of ["/dashboard", "/review", "/moderation", "/admin", "/api", "/auth"]) {
      expect(robots).toContain(`"${privat}"`);
    }
    // Jangan sampai direktori/kategori/kontributor ikut diblokir.
    for (const publik of ["/info", "/kategori", "/kontributor"]) {
      expect(robots).not.toContain(`"${publik}"`);
    }
  });
});
