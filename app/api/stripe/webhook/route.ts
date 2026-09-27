import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

// Stripe appelle cette adresse à chaque événement de paiement.
// La signature est vérifiée : personne d'autre que Stripe ne peut déclencher ces actions.
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !secret) {
    return new Response("Webhook non configuré", { status: 500 });
  }
  if (!signature) {
    return new Response("Signature manquante", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // Étape 3 : création du compte et activation de l'abonnement en base.
      console.log("Paiement confirmé", {
        session: session.id,
        email: session.customer_details?.email,
        subscription: session.subscription,
      });
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      console.log("Abonnement mis à jour", {
        subscription: subscription.id,
        status: subscription.status,
      });
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      console.log("Échec de paiement", { invoice: invoice.id });
      break;
    }
  }

  return Response.json({ received: true });
}
