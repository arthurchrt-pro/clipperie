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

// Portail client Stripe (carte, factures, résiliation), configuré automatiquement la première fois.
export async function getPortalConfigurationId(
  stripe: Stripe,
  origin: string,
): Promise<string> {
  const { data } = await stripe.billingPortal.configurations.list({
    is_default: true,
    active: true,
    limit: 1,
  });
  if (data[0]) return data[0].id;

  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: {
      privacy_policy_url: `${origin}/confidentialite`,
      terms_of_service_url: `${origin}/cgv`,
    },
    features: {
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
    },
    default_return_url: `${origin}/app`,
  });
  return configuration.id;
}
