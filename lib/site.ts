// Informations publiques du site, utilisées dans les métadonnées et les pages.

export const SITE = {
  name: "Clipperie",
  // La promesse des vidéos courtes, reprise mot pour mot en haut de la landing.
  promise: "Un live de deux heures devient trente clips verticaux.",
  description:
    "Dépose ta vidéo longue\u00a0: Clipperie repère les meilleurs moments, les recadre à la verticale et les sous-titre. Trente clips prêts à publier sur TikTok, Reels et Shorts.",
  price: "49 €",
  clipsPerMonth: 60,
  // Délai de livraison promis pendant la prévente (offre de lancement).
  launchDeliveryDays: 7,
};

export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

// Informations légales de l'éditeur.
// Chaque valeur à null s'affiche sur le site comme un champ surligné « À COMPLÉTER ».
export const LEGAL = {
  // Prénom et nom de l'entrepreneur individuel, ex. "Marie Dupont"
  editeur: null as string | null,
  // Numéro SIRET à 14 chiffres (celui de la micro-entreprise existante)
  siret: null as string | null,
  // Adresse postale de domiciliation de l'entreprise
  adresse: null as string | null,
  // Adresse email de contact affichée publiquement, ex. "bonjour@clipperie.fr"
  email: null as string | null,
  // Mention TVA : à garder tant que tu es en franchise de TVA
  tva: "TVA non applicable, article 293 B du Code général des impôts.",
  // Médiateur de la consommation : nom et site web, ex. "CM2C — www.cm2c.net"
  mediateur: null as string | null,
  // Durées de conservation des fichiers (engagement pris dans les CGV)
  sourceRetentionDays: 7,
  clipRetentionDays: 30,
};

// Hébergeur du site (obligatoire dans les mentions légales).
export const HOST = {
  name: "Vercel Inc.",
  address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  url: "https://vercel.com",
};
