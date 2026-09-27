import "server-only";
import { headers } from "next/headers";
import { siteUrl } from "./site";

// Adresse du site telle que le visiteur l'utilise (production ou aperçu).
export async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return siteUrl();
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
