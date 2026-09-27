import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "./supabase/server";

type Admin = ReturnType<typeof createAdminClient>;

// Retrouve le compte lié à cet email, ou le crée (le profil suit automatiquement).
async function findOrCreateUser(admin: Admin, rawEmail: string): Promise<string> {
  const email = rawEmail.trim().toLowerCase();
  const findProfile = () =>
    admin.from("profiles").select("id").eq("email", email).maybeSingle();

  const { data: profile, error } = await findProfile();
  if (error) throw error;
  if (profile) return profile.id;

  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (!createError) return data.user.id;

  // Deux notifications simultanées : le compte vient d'être créé par l'autre.
  const { data: existing } = await findProfile();
  if (existing) return existing.id;
  throw createError;
}

function toIso(seconds: number | undefined) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function saveSubscription(
  admin: Admin,
  userId: string,
  subscription: Stripe.Subscription,
  checkoutSessionId?: string,
) {
  const item = subscription.items.data[0];
  const { error } = await admin.from("subscriptions").upsert(
    {
      id: subscription.id,
      user_id: userId,
      status: subscription.status,
      current_period_start: toIso(item?.current_period_start),
      current_period_end: toIso(item?.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
      ...(checkoutSessionId ? { checkout_session_id: checkoutSessionId } : {}),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

function idOf(value: string | { id: string } | null) {
  return typeof value === "string" ? value : (value?.id ?? null);
}

// Paiement confirmé par Stripe : création du compte et activation de l'abonnement.
export async function activateCheckout(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  if (session.mode !== "subscription" || session.status !== "complete") return;

  const email = session.customer_details?.email;
  const subscriptionId = idOf(session.subscription);
  const customerId = idOf(session.customer);
  if (!email || !subscriptionId) {
    throw new Error(`Session ${session.id} sans email ou sans abonnement`);
  }

  const admin = createAdminClient();
  const userId = await findOrCreateUser(admin, email);
  if (customerId) {
    const { error } = await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
    if (error) throw error;
  }

  // État le plus récent de l'abonnement, plutôt que celui figé dans l'événement.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await saveSubscription(admin, userId, subscription, session.id);
}

// Changement d'abonnement (renouvellement, impayé, résiliation) : mise à jour de la copie locale.
export async function syncSubscription(stripe: Stripe, subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = idOf(subscription.customer);
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  // Compte pas encore activé : l'événement checkout.session.completed s'en chargera.
  if (!profile) return;
  await saveSubscription(admin, profile.id, subscription);
}
