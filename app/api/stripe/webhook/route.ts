import type Stripe from "stripe";
import { activateCheckout, syncSubscription } from "@/lib/fulfillment";
import { getStripe } from "@/lib/stripe";

// Stripe appelle cette adresse à chaque événement de paiement.
// La signature est vérifiée : personne d'autre que Stripe ne peut déclencher ces actions.
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return new Response("Webhook non configuré", { status: 500 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Signature manquante", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await activateCheckout(stripe, event.data.object);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(stripe, event.data.object.id);
        break;
      case "invoice.payment_failed":
        // Le statut « impayé » arrive aussi par customer.subscription.updated.
        console.warn("Échec de paiement", { invoice: event.data.object.id });
        break;
    }
  } catch (error) {
    // Réponse 500 : Stripe renverra l'événement plus tard.
    console.error(`Traitement impossible de ${event.type} (${event.id})`, error);
    return new Response("Erreur de traitement", { status: 500 });
  }

  return Response.json({ received: true });
}
