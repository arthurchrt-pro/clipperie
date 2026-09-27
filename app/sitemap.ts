import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return ["", "/cgv", "/mentions-legales", "/confidentialite"].map((path) => ({
    url: `${base}${path}`,
  }));
}
