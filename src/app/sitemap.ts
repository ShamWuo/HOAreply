import type { MetadataRoute } from "next";

const site = (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: `${site}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${site}/auth/signup`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${site}/auth/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
