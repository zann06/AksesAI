import type { MetadataRoute } from "next";

import { clientEnv } from "@/lib/env";
import { getCategories } from "@/lib/programs/categories";
import { listPublicContributorPaths, listPublicProgramPaths } from "@/lib/programs/seo";

/**
 * Sitemap: rute statis + seluruh entri publik (verified/expired) + halaman
 * kategori + halaman kontributor.
 *
 * Dua kelompok terakhir sebelumnya TIDAK pernah masuk sitemap, padahal
 * keduanya rute publik yang punya metadata sendiri dan isi yang layak
 * diindeks. Akibatnya Google hanya menemukan halaman kategori/kontributor
 * lewat tautan internal yang belum tentu ada.
 *
 * Semua query dibungkus cache 5 menit; bila DB tidak siap, sitemap tetap
 * terbit dengan rute statis saja (tidak pernah gagal permintaan crawler).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = clientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes: Array<{ path: string; priority: number; freq: "weekly" | "monthly" }> = [
    { path: "", priority: 1, freq: "weekly" },
    { path: "/info", priority: 0.9, freq: "weekly" },
    { path: "/panduan", priority: 0.6, freq: "monthly" },
    { path: "/tentang", priority: 0.5, freq: "monthly" },
    { path: "/ketentuan-penggunaan", priority: 0.3, freq: "monthly" },
    { path: "/kebijakan-privasi", priority: 0.3, freq: "monthly" },
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${site}${route.path}`,
    lastModified: now,
    changeFrequency: route.freq,
    priority: route.priority,
  }));

  const paths = await listPublicProgramPaths();
  for (const { slug, updatedAt } of paths) {
    entries.push({
      url: `${site}/info/${encodeURIComponent(slug)}`,
      lastModified: updatedAt ? new Date(updatedAt) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Kategori: halaman pengelompokan yang mengumpulkan entri sejenis.
  // Prioritas lebih rendah dari entri karena isinya berubah mengikuti entri.
  const categories = await getCategories();
  for (const category of categories) {
    entries.push({
      url: `${site}/kategori/${encodeURIComponent(category.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  // Profil kontributor: hanya yang punya minimal satu entri publik, agar
  // sitemap tidak mengirim URL yang berujung 404.
  const usernames = await listPublicContributorPaths();
  for (const username of usernames) {
    entries.push({
      url: `${site}/kontributor/${encodeURIComponent(username)}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    });
  }

  return entries;
}
