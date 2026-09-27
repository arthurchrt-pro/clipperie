import Stripe from "stripe";
import { getStripe, getSubscriptionPriceId } from "@/lib/stripe";

// Le bouton « Commencer » envoie ici : on crée une session Stripe Checkout et on y redirige.
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const stripe = getStripe();

  // Stripe pas encore configuré : page d'attente plutôt qu'une erreur.
  if (!stripe) return Response.redirect(`${origin}/bientot`, 303);

  const cgv = `${origin}/cgv`;
  const noCommitment = "Sans engagement : tu résilies en ligne quand tu veux.";

  try {
    const base: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: await getSubscriptionPriceId(stripe), quantity: 1 }],
      locale: "fr",
      allow_promotion_codes: true,
      success_url: `${origin}/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/paiement-annule`,
    };

    let session: Stripe.Checkout.Session;
    try {
      // Case « J'accepte les CGV » obligatoire avant de payer.
      session = await stripe.checkout.sessions.create({
        ...base,
        consent_collection: { terms_of_service: "required" },
        custom_text: {
          terms_of_service_acceptance: {
            message: `J’accepte les [conditions générales de vente](${cgv}) et je demande l’accès immédiat au service. Si je me rétracte sous 14 jours, le service déjà fourni reste dû au prorata.`,
          },
          submit: { message: noCommitment },
        },
      });
    } catch (error) {
      // La case exige un lien de CGV déclaré dans Stripe (Informations publiques).
      // S'il manque, on affiche l'acceptation des CGV sous le bouton de paiement.
      const missingTermsUrl =
        error instanceof Stripe.errors.StripeInvalidRequestError &&
        /terms.of.service|consent_collection/i.test(
          `${error.param ?? ""} ${error.message}`,
        );
      if (!missingTermsUrl) throw error;
      console.warn(
        "Lien des CGV absent des informations publiques Stripe : acceptation affichée sous le bouton.",
      );
      session = await stripe.checkout.sessions.create({
        ...base,
        custom_text: {
          submit: {
            message: `En t’abonnant, tu acceptes les CGV (${cgv}) et demandes l’accès immédiat au service ; en cas de rétractation sous 14 jours, le service déjà fourni reste dû au prorata. ${noCommitment}`,
          },
        },
      });
    }

    if (!session.url) throw new Error("Session Stripe sans URL");
    return Response.redirect(session.url, 303);
  } catch (error) {
    console.error("Création de la session de paiement impossible", error);
    return Response.redirect(`${origin}/paiement-annule`, 303);
  }
}
