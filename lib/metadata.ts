import type { Metadata } from "next";
import { SITE } from "./site";

// Image d'aperçu générée par app/opengraph-image.tsx, partagée par toutes les pages publiques.
const ogImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: SITE.promise,
};

// Titre, description et aperçu de partage (Open Graph) d'une page publique.
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE.name,
      locale: "fr_FR",
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.url],
    },
  };
}
