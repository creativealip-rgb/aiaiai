import type { MetadataRoute } from "next";

import { env } from "@/lib/env";
import { listSeoCategories, listSeoProducts } from "@/server/queries/seo";

function absolute(path: string): string {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [categories, products] = await Promise.all([
    listSeoCategories(),
    listSeoProducts(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absolute("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absolute("/products"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absolute(`/c/${category.slug}`),
    lastModified: category.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: absolute(`/products/${product.slug}`),
    lastModified: product.updatedAt,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
