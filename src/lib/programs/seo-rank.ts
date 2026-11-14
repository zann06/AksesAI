/**
 * Logika peringkat "Kontributor paling aktif" — dipisah dari `./seo.ts`
 * karena `seo.ts` memuat `server-only` dan koneksi Supabase, sehingga tidak
 * bisa diimpor unit test. Di sinilah letak perilaku yang paling mudah rusak
 * diam-diam (pemecah seri, penyaringan nol, pemotongan), jadi harus teruji.
 */

/**
 * Satu baris di daftar kontributor beranda.
 *
 * Tipenya tinggal di sini — bukan di `./seo.ts` — agar modul ini tidak
 * mengimpor balik `./seo.ts`. Keduanya saling membutuhkan (seo.ts memakai
 * `rankTopContributors`, modul ini memakai tipe hasilnya); menaruh tipe di
 * sini memutus siklus impor. `seo.ts` mengekspor ulang tipe ini agar pemanggil
 * lama tetap bekerja.
 */
export type TopContributor = {
  username: string;
  avatarUrl: string | null;
  contributionCount: number;
};

/** Baris mentah hasil agregasi PostgREST sebelum diurutkan & dipotong. */
export type RawTopContributorRow = {
  github_username: string;
  github_avatar: string | null;
  assistance_programs: Array<{ count: number }> | null;
  /** Diambil untuk memecah seri; tidak dikirim ke UI. */
  latestVerifiedAt?: string | null;
};

/**
 * Jumlah kontributor yang ditampilkan di beranda.
 *
 * Diekspor karena nilai yang sama dipakai `page.tsx`: angka `3` pernah ditulis
 * terpisah di dua tempat (default parameter + pemanggil), sehingga mengubah satu
 * tempat saja membuat perilaku tidak sesuai niat.
 *
 * Mengapa 9, bukan 3: dengan batas 3, siapa pun yang baru mengirim satu entri
 * praktis tidak pernah muncul — daftar hanya berisi kontributor lama. Untuk
 * direktori komunitas itu insentif yang salah. Batas 9 membuat kontribusi
 * pertama tetap terlihat, sambil menjaga daftar tetap ringkas.
 */
export const TOP_CONTRIBUTORS_LIMIT = 9;

/**
 * Mengurutkan dan memotong daftar kontributor.
 *
 * Di sinilah letak perilaku yang mudah salah dan sulit terlihat:
 *
 * 1. **Seri harus deterministik.** Banyak kontributor berbagi jumlah entri yang
 *    sama (mis. dua orang sama-sama 1 entri). Tanpa pemecah seri, urutan
 *    mengikuti apa pun yang dikembalikan PostgREST — yang tidak dijamin stabil
 *    antar-request. Akibatnya peringkat bisa berganti sendiri setiap cache
 *    dingin tanpa ada yang berkontribusi. Pemecah seri: entri terverifikasi
 *    paling baru, lalu username secara abjad (agar tetap stabil bila tanggalnya
 *    juga sama).
 * 2. **Nol bukan informasi.** Kontributor tanpa entri publik tidak pernah
 *    ditampilkan; menampilkannya berarti memberi baris "0 info terverifikasi".
 */
export function rankTopContributors(
  rows: RawTopContributorRow[],
  limit: number,
): TopContributor[] {
  return rows
    .map((row) => ({
      username: row.github_username,
      avatarUrl: row.github_avatar,
      contributionCount: row.assistance_programs?.[0]?.count ?? 0,
      latestVerifiedAt: row.latestVerifiedAt ?? "",
    }))
    .filter((row) => row.contributionCount > 0)
    .sort(
      (a, b) =>
        b.contributionCount - a.contributionCount ||
        // Tanggal berupa string ISO-8601 UTC, jadi perbandingan leksikografis
        // setara dengan perbandingan waktu.
        (a.latestVerifiedAt < b.latestVerifiedAt
          ? 1
          : a.latestVerifiedAt > b.latestVerifiedAt
            ? -1
            : 0) ||
        a.username.localeCompare(b.username),
    )
    .slice(0, limit)
    .map(({ username, avatarUrl, contributionCount }) => ({
      username,
      avatarUrl,
      contributionCount,
    }));
}
