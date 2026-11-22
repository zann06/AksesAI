/**
 * Slug dasar dari judul (huruf kecil, alfanumerik, tanda hubung).
 * Mirror dari fungsi SQL `public.slugify` — dipakai untuk membuat slug di server
 * sebelum disimpan (sufiks acak ditambahkan oleh pemanggil).
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Panjang maksimum bagian dasar slug (sebelum sufiks acak). */
export const SLUG_BASE_MAX = 80;

/**
 * Membuat slug dasar dari judul dengan aman untuk constraint database
 * `programs_slug_format` (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).
 *
 * Memotong judul mentah lebih dulu baru men-slugify, bukan sebaliknya: memotong
 * hasil slugify bisa menyisakan tanda hubung di ujung sehingga insert ditolak
 * database. Judul panjang kini tidak lagi menggagalkan penyimpanan.
 */
export function buildSlugBase(input: string, max = SLUG_BASE_MAX): string {
  // Sisakan ruang untuk potongan terakhir agar tidak berakhir di tanda hubung.
  const base = slugify(input.slice(0, max + 1)).slice(0, max).replace(/-+$/, "");
  return base || "entri";
}
