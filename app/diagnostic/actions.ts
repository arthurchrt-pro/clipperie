"use server";

import { redirect } from "next/navigation";
import { activateCheckout } from "@/lib/fulfillment";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

function describeError(error: unknown) {
  if (error && typeof error === "object") {
    const e = error as { code?: string; type?: string; message?: string };
    return [e.code ?? e.type, e.message].filter(Boolean).join(" — ").slice(0, 300);
  }
  return String(error).slice(0, 300);
}

// Rejoue l'activation des paiements récents que le webhook n'a pas encore traités.
// Ne fait rien d'autre que le webhook : les données viennent directement de Stripe.
export async function activatePendingPayments() {
  const stripe = getStripe();
  let result: string;
  if (!stripe) {
    result = "Stripe n’est pas configuré.";
  } else {
    try {
      const admin = createAdminClient();
      const { data: sessions } = await stripe.checkout.sessions.list({ limit: 10 });
      const paid = sessions.filter((s) => s.status === "complete" && s.mode === "subscription");
      const { data: done, error } = await admin
        .from("subscriptions")
        .select("checkout_session_id")
        .in("checkout_session_id", paid.map((s) => s.id));
      if (error) throw error;
      const already = new Set(done?.map((row) => row.checkout_session_id));
      const pending = paid.filter((s) => !already.has(s.id));

      let activated = 0;
      let firstError = "";
      for (const session of pending) {
        try {
          await activateCheckout(stripe, session);
          activated += 1;
        } catch (err) {
          console.error("Activation impossible", session.id, err);
          firstError ||= describeError(err);
        }
      }
      result = firstError
        ? `${activated} activé(s) sur ${pending.length}. Erreur : ${firstError}`
        : `${activated} paiement(s) activé(s) sur ${pending.length} en attente.`;
    } catch (err) {
      result = `Erreur : ${describeError(err)}`;
    }
  }
  redirect(`/diagnostic?resultat=${encodeURIComponent(result)}`);
}
