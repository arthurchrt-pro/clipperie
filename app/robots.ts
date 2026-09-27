import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/bientot", "/merci", "/paiement-annule"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
