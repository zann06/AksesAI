import { describe, expect, it } from "vitest";

// `rankTopContributors` sengaja bebas dari `server-only` dan koneksi database
// sehingga logika urutan bisa diuji langsung. Tipe `TopContributor` dan
// konstanta limit tinggal di modul pembungkusnya.
import {
  rankTopContributors,
  TOP_CONTRIBUTORS_LIMIT,
  type RawTopContributorRow,
} from "@/lib/programs/seo-rank";

const RAW = (
  username: string,
  count: number | null,
  latestVerifiedAt = "",
): RawTopContributorRow => ({
  github_username: username,
  github_avatar: null,
  assistance_programs: count === null ? null : [{ count }],
  latestVerifiedAt,
});

describe("TOP_CONTRIBUTORS_LIMIT", () => {
  it("menampilkan 9 kontributor di beranda", () => {
    expect(TOP_CONTRIBUTORS_LIMIT).toBe(9);
  });
});

describe("rankTopContributors", () => {
  it("mengurutkan dari jumlah entri terbanyak", () => {
    const result = rankTopContributors([RAW("a", 1), RAW("b", 21), RAW("c", 3)], 9);
    expect(result.map((r) => r.username)).toEqual(["b", "c", "a"]);
  });

  it("membuang kontributor tanpa entri publik (nol bukan informasi)", () => {
    const result = rankTopContributors([RAW("a", 0), RAW("b", 2)], 9);
    expect(result.map((r) => r.username)).toEqual(["b"]);
  });

  it("memecah seri dengan entri terverifikasi terbaru", () => {
    const result = rankTopContributors(
      [
        RAW("lama", 1, "2026-01-01T00:00:00Z"),
        RAW("baru", 1, "2026-11-14T08:42:40Z"),
      ],
      9,
    );
    expect(result.map((r) => r.username)).toEqual(["baru", "lama"]);
  });

  it("memecah seri yang benar-benar identik secara abjad agar stabil", () => {
    const input = [RAW("zeta", 1), RAW("alfa", 1), RAW("mid", 1)];
    // Urutan masukan diacak: hasil harus selalu sama.
    const a = rankTopContributors(input, 9).map((r) => r.username);
    const b = rankTopContributors([...input].reverse(), 9).map((r) => r.username);
    expect(a).toEqual(["alfa", "mid", "zeta"]);
    expect(b).toEqual(a);
  });

  it("membatasi hasil sesuai limit", () => {
    const rows = Array.from({ length: 20 }, (_, i) => RAW(`u${i}`, i + 1));
    expect(rankTopContributors(rows, 9)).toHaveLength(9);
  });

  it("tidak membocorkan latestVerifiedAt ke hasil", () => {
    const result = rankTopContributors([RAW("a", 1, "2026-01-01T00:00:00Z")], 9);
    expect(result).toHaveLength(1);
    const first = result[0]!;
    expect(Object.keys(first).sort()).toEqual(["avatarUrl", "contributionCount", "username"]);
  });

  it("mengembalikan array kosong bila tidak ada kontributor", () => {
    expect(rankTopContributors([], 9)).toEqual([]);
  });

  it("menangani baris agregasi null tanpa melempar galat", () => {
    expect(rankTopContributors([RAW("a", null)], 9)).toEqual([]);
  });

  it("mempertahankan baris berjumlah 1 saat direktori masih kecil", () => {
    // Skenario nyata: 4 kontributor, dua di antaranya sama-sama 1 entri.
    // Keduanya harus tetap tampil begitu limit dinaikkan dari 3 ke 9.
    const result = rankTopContributors(
      [
        RAW("zann06", 21, "2026-11-01T00:00:00Z"),
        RAW("keyyjuya", 3, "2026-11-02T00:00:00Z"),
        RAW("Xorions", 1, "2026-11-10T00:00:00Z"),
        RAW("aditsaputrapkp-cmyk", 1, "2026-11-14T08:42:40Z"),
      ],
      9,
    );
    expect(result.map((r) => r.username)).toEqual([
      "zann06",
      "keyyjuya",
      "aditsaputrapkp-cmyk",
      "Xorions",
    ]);
  });
});
