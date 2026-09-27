// Étape 1 : Stripe n'est pas encore branché, le bouton mène à une page d'attente.
// Étape 2 : cette route créera la session de paiement Stripe Checkout.
export async function POST(request: Request) {
  return Response.redirect(new URL("/bientot", request.url), 303);
}
