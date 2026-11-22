import { describe, expect, it } from "vitest";

import { buildSlugBase, SLUG_BASE_MAX, slugify } from "@/lib/slug";

/**
 * Tes `slugify` (PHASE 8). Fungsi ini harus sepadan dengan `public.slugify` di
 * SQL karena slug dipakai sebagai kunci URL publik dan untuk deteksi duplikat.
 */
describe("slugify", () => {
  it("menghasilkan slug huruf kecil dengan tanda hubung", () => {
    expect(slugify("Beasiswa Pendidikan untuk Siswa SMA")).toBe(
      "beasiswa-pendidikan-untuk-siswa-sma",
    );
  });

  it("menghapus tanda baca dan karakter non-alfanumerik", () => {
    expect(slugify("Bantuan!!! Sosial?? (2026)")).toBe("bantuan-sosial-2026");
  });

  it("merapikan tanda hubung berlebih di tepi", () => {
    expect(slugify("---Halo---Dunia---")).toBe("halo-dunia");
  });

  it("menggabungkan spasi & tanda hubung berurutan jadi satu", () => {
    expect(slugify("bantuan   -   pangan")).toBe("bantuan-pangan");
  });

  it("menghilangkan diakritik (é → e, ñ → n)", () => {
    expect(slugify("Café Señor")).toBe("cafe-senor");
  });

  it("menangani huruf beraksen hasil dekomposisi NFKD", () => {
    expect(slugify("Kébeutuhan")).toBe("kebeutuhan");
  });

  it("mempertahankan angka", () => {
    expect(slugify("Program 2026 Tahap 2")).toBe("program-2026-tahap-2");
  });

  it("mengembalikan string kosong untuk input tanpa karakter valid", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("   ")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("menghasilkan keluaran idempoten", () => {
    const once = slugify("Bantuan Pendidikan");
    expect(slugify(once)).toBe(once);
  });

  it("tidak pernah menghasilkan tanda hubung di awal/akhir", () => {
    for (const input of ["  halo  ", "//halo//", "Halo Dunia!", "***"]) {
      const out = slugify(input);
      if (out.length > 0) {
        expect(out.startsWith("-")).toBe(false);
        expect(out.endsWith("-")).toBe(false);
      }
    }
  });
});

/**
 * Regresi: dulu slug dibuat dengan `slugify(judul).slice(0, 80)`. Bila karakter
 * ke-80 jatuh tepat di tanda hubung, slug berakhir dengan "-" dan ditolak
 * constraint `programs_slug_format`, sehingga penyimpanan draf gagal total
 * dengan pesan "Gagal menyimpan draf". Judul panjang harus tetap aman.
 */
describe("buildSlugBase", () => {
  const POLA_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  it("memotong judul panjang tanpa menyisakan tanda hubung di ujung", () => {
    // Judul asli yang memicu bug: potongan ke-80 jatuh tepat di tanda hubung.
    const judul =
      "Yeta — DeepSeek V4.1 Flash Uncensored, konteks 1 juta token dari $0,08/1 juta token input";
    const base = buildSlugBase(judul);
    expect(base.endsWith("-")).toBe(false);
    expect(base).toMatch(POLA_SLUG);
    expect(base.length).toBeLessThanOrEqual(SLUG_BASE_MAX);
  });

  it("selalu memenuhi pola slug untuk judul panjang apa pun", () => {
    const judulPanjang = [
      "Abliterated.cc — API uncensored OpenAI-compatible, konteks 100 ribu token, kredit uji 7 hari",
      "Provider X ".repeat(30),
      `${"a".repeat(79)} b`,
      `${"kata ".repeat(40)}akhir`,
    ];
    for (const judul of judulPanjang) {
      const base = buildSlugBase(judul);
      expect(base).toMatch(POLA_SLUG);
      expect(base.length).toBeLessThanOrEqual(SLUG_BASE_MAX);
      expect(base.startsWith("-")).toBe(false);
      expect(base.endsWith("-")).toBe(false);
    }
  });

  it("tidak memotong slug yang sudah pendek", () => {
    expect(buildSlugBase("Groq API Gratis")).toBe("groq-api-gratis");
  });

  it("memberi fallback untuk judul tanpa karakter valid", () => {
    expect(buildSlugBase("!!!")).toBe("entri");
    expect(buildSlugBase("")).toBe("entri");
  });

  it("menghormati batas panjang kustom", () => {
    const base = buildSlugBase("kata ".repeat(40), 20);
    expect(base.length).toBeLessThanOrEqual(20);
    expect(base).toMatch(POLA_SLUG);
  });
});
