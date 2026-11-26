import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Penjaga regresi kontras seleksi teks.
 *
 * PR #15 (2026-11-26) memperbaiki blok seleksi yang nyaris tak terlihat di
 * area terang, tetapi menukarnya dengan masalah baru: blok hijau di atas band
 * hijau hutan (1.95:1) dan kontras teks turun dari 15.67:1 ke 6.11:1.
 *
 * Tes ini mengunci keputusan akhir: satu lapis global untuk area terang,
 * satu lapis untuk .hero-forest, dan lapis tambahan untuk tombol berlatar
 * pekat. Angka dihitung ulang dari globals.css, bukan disalin manual.
 */

const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** Ambil nilai token warna dari blok @theme. */
function token(nama: string): string {
  const m = CSS.match(new RegExp(`--${nama}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m?.[1]) throw new Error(`Token --${nama} tidak ditemukan di globals.css`);
  return m[1].toLowerCase();
}

/** Ambil isi satu aturan CSS berdasarkan selector-nya. */
function aturan(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = CSS.match(new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([^}]*)\\}`));
  if (!m?.[1]) throw new Error(`Aturan ${selector} tidak ditemukan di globals.css`);
  return m[1];
}

function ambilWarna(blok: string, properti: "background-color" | "color"): string {
  // `(?<!-)` mencegah `color:` ikut mencocokkan `background-color:`.
  const pola = properti === "color" ? "(?<!-)color" : "background-color";
  const m = blok.match(new RegExp(`${pola}:\\s*var\\(--([a-z-]+)\\)`));
  if (!m?.[1]) throw new Error(`Properti ${properti} dengan var() tidak ditemukan`);
  return token(m[1]);
}

const hexKeRgb = (hex: string): [number, number, number] => {
  const n = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as [number, number, number];
};

const luminansi = (hex: string): number => {
  const [r, g, b] = hexKeRgb(hex);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const kontras = (a: string, b: string): number => {
  const la = luminansi(a);
  const lb = luminansi(b);
  const terang = Math.max(la, lb);
  const gelap = Math.min(la, lb);
  return (terang + 0.05) / (gelap + 0.05);
};

// Ambang WCAG 2.1: 1.4.11 (non-teks) = 3:1, 1.4.3 (teks) = 4.5:1.
const AMBANG_BLOK = 3;
const AMBANG_TEKS = 4.5;

describe("kontras blok seleksi teks", () => {
  describe("lapis 1 — global (area terang)", () => {
    const blok = ambilWarna(aturan("::selection"), "background-color");
    const teks = ambilWarna(aturan("::selection"), "color");

    it.each([
      ["background", "color-background"],
      ["surface (blok kode)", "color-surface"],
      ["surface-raised", "color-surface-raised"],
      ["muted", "color-muted"],
      ["primary-soft", "color-primary-soft"],
    ])("blok seleksi terlihat di atas %s", (_nama, namaToken) => {
      const rasio = kontras(blok, token(namaToken));
      expect(rasio).toBeGreaterThanOrEqual(AMBANG_BLOK);
    });

    it("teks di dalam blok tetap terbaca", () => {
      expect(kontras(blok, teks)).toBeGreaterThanOrEqual(AMBANG_TEKS);
    });

    it("tidak memakai teks putih di atas blok teal", () => {
      // Teks putih di atas blok teal hanya ~2:1 — ini kesalahan PR #15.
      expect(kontras(blok, "#ffffff")).toBeLessThan(AMBANG_TEKS);
      expect(teks).not.toBe("#ffffff");
    });
  });

  describe("lapis 2 — band hijau hutan", () => {
    const blok = ambilWarna(aturan(".hero-forest ::selection"), "background-color");
    const teks = ambilWarna(aturan(".hero-forest ::selection"), "color");

    it.each([
      ["forest", "color-forest"],
      ["forest-deep", "color-forest-deep"],
    ])("blok seleksi terlihat di atas %s", (_nama, namaToken) => {
      const rasio = kontras(blok, token(namaToken));
      expect(rasio).toBeGreaterThanOrEqual(AMBANG_BLOK);
    });

    it("teks di dalam blok terbaca", () => {
      expect(kontras(blok, teks)).toBeGreaterThanOrEqual(AMBANG_TEKS);
    });

    it("lebih tegas daripada sekadar memakai warna primary", () => {
      // Regresi PR #15: primary di atas forest hanya 1.95:1.
      const primaryDiForest = kontras(token("color-primary"), token("color-forest"));
      expect(primaryDiForest).toBeLessThan(AMBANG_BLOK);
      expect(kontras(blok, token("color-forest"))).toBeGreaterThan(primaryDiForest);
    });
  });

  describe("lapis 3 — tombol berlatar pekat", () => {
    const blok = ambilWarna(aturan(".bg-primary::selection,\n  .bg-accent::selection,\n  .bg-danger::selection"), "background-color");
    const teks = ambilWarna(
      aturan(".bg-primary::selection,\n  .bg-accent::selection,\n  .bg-danger::selection"),
      "color",
    );

    it.each([
      ["primary", "color-primary"],
      ["primary-hover", "color-primary-hover"],
      ["primary-active", "color-primary-active"],
      ["accent", "color-accent"],
      ["danger", "color-danger"],
    ])("blok seleksi terlihat di atas %s", (_nama, namaToken) => {
      const rasio = kontras(blok, token(namaToken));
      expect(rasio).toBeGreaterThanOrEqual(AMBANG_BLOK);
    });

    it("teks di dalam blok terbaca", () => {
      expect(kontras(blok, teks)).toBeGreaterThanOrEqual(AMBANG_TEKS);
    });
  });

  describe("lapis 4 — tombol cream", () => {
    const blok = ambilWarna(aturan(".bg-sand::selection"), "background-color");

    it.each([
      ["sand", "color-sand"],
      ["sand-bright", "color-sand-bright"],
    ])("blok seleksi terlihat di atas %s", (_nama, namaToken) => {
      expect(kontras(blok, token(namaToken))).toBeGreaterThanOrEqual(AMBANG_BLOK);
    });
  });
});
