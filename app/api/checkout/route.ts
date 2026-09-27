import { getStripe, getSubscriptionPriceId } from "@/lib/stripe";

// Le bouton « Commencer » envoie ici : on crée une session Stripe Checkout et on y redirige.
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const stripe = getStripe();

  // Stripe pas encore configuré : page d'attente plutôt qu'une erreur.
  if (!stripe) return Response.redirect(`${origin}/bientot`, 303);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: await getSubscriptionPriceId(stripe), quantity: 1 }],
      locale: "fr",
      allow_promotion_codes: true,
      success_url: `${origin}/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/paiement-annule`,
      consent_collection: { terms_of_service: "required" },
      custom_text: {
        terms_of_service_acceptance: {
          message: `J’accepte les [conditions générales de vente](${origin}/cgv) et je demande l’accès immédiat au service. Si je me rétracte sous 14 jours, le service déjà fourni reste dû au prorata.`,
        },
        submit: {
          message: "Sans engagement : tu résilies en ligne quand tu veux.",
        },
      },
    });
    if (!session.url) throw new Error("Session Stripe sans URL");
    return Response.redirect(session.url, 303);
  } catch (error) {
    console.error("Création de la session de paiement impossible", error);
    return Response.redirect(`${origin}/paiement-annule`, 303);
  }
}
