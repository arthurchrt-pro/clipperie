import "server-only";
import Stripe from "stripe";

// Client Stripe côté serveur uniquement : la clé secrète ne quitte jamais le serveur.
let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  // trim() : un espace ou un retour à la ligne collé avec la clé la rendrait invalide.
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

// Le prix de l'abonnement est retrouvé par sa clé, ou créé automatiquement la première fois.
const PRICE_LOOKUP_KEY = "clipperie_mensuel_49";

export async function getSubscriptionPriceId(stripe: Stripe): Promise<string> {
  const { data } = await stripe.prices.list({
    lookup_keys: [PRICE_LOOKUP_KEY],
    active: true,
    limit: 1,
  });
  if (data[0]) return data[0].id;

  const product = await stripe.products.create({
    name: "Clipperie — abonnement mensuel",
    description: "20 heures de live par mois, soit environ 300 clips TikTok.",
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "eur",
    unit_amount: 4900,
    recurring: { interval: "month" },
    lookup_key: PRICE_LOOKUP_KEY,
    transfer_lookup_key: true,
  });
  return price.id;
}
