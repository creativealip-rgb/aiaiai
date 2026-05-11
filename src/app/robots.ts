import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

const siteUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/products", "/c/", "/products/"],
        disallow: [
          "/admin/",
          "/dashboard/",
          "/checkout",
          "/cart",
          "/order/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

