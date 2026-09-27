"use server";

import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// Délai pendant lequel la page « Merci » ouvre l'espace sans passer par l'email.
const DIRECT_ACCESS_SECONDS = 2 * 60 * 60;

// Ouvre l'espace du client juste après son paiement, une seule fois.
// Tout est revérifié ici : le paiement auprès de Stripe, l'activation par le webhook.
export async function claimAccess(formData: FormData) {
  const sessionId = String(formData.get("session_id") ?? "");
  const stripe = getStripe();
  if (!stripe || !isSupabaseConfigured() || !sessionId.startsWith("cs_")) {
    redirect("/connexion");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId).catch(() => null);
  const email = session?.customer_details?.email;
  const tooOld =
    !session || Date.now() / 1000 - session.created > DIRECT_ACCESS_SECONDS;
  if (!session || session.status !== "complete" || !email || tooOld) {
    redirect("/connexion");
  }

  const admin = createAdminClient();
  const { data: claimed } = await admin
    .from("subscriptions")
    .update({ access_claimed_at: new Date().toISOString() })
    .eq("checkout_session_id", sessionId)
    .is("access_claimed_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) redirect(`/connexion?email=${encodeURIComponent(email)}`);

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (error || !tokenHash) redirect("/connexion?erreur=acces");

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (verifyError) redirect("/connexion?erreur=acces");

  redirect("/app");
}
