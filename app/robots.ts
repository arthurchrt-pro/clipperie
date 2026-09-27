import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/app", "/auth/", "/bientot", "/connexion", "/merci", "/paiement-annule"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
