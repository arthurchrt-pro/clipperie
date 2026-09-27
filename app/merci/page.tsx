import type { Metadata } from "next";
import { StatusScreen } from "@/components/StatusScreen";
import { LEGAL, SITE } from "@/lib/site";
import { getStripe } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Merci",
  robots: { index: false },
};

// Page affichée après le paiement. Elle vérifie la session auprès de Stripe,
// mais n'active rien : l'activation passe uniquement par le webhook signé.
async function getPaidEmail(sessionId: string | undefined) {
  const stripe = getStripe();
  if (!stripe || !sessionId?.startsWith("cs_")) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status !== "complete") return null;
    return session.customer_details?.email ?? "";
  } catch {
    return null;
  }
}

export default async function Merci({ searchParams }: PageProps<"/merci">) {
  const { session_id } = await searchParams;
  const email = await getPaidEmail(
    typeof session_id === "string" ? session_id : undefined,
  );

  if (email === null) {
    return (
      <StatusScreen
        code="Vérification"
        title="On ne retrouve pas ce paiement."
        text={`Si ta carte a été débitée, pas d’inquiétude : écris-nous à ${LEGAL.email ?? "l’adresse indiquée dans les mentions légales"} et on règle ça rapidement.`}
      />
    );
  }

  return (
    <StatusScreen
      code="Paiement confirmé"
      title="C’est dans la boîte."
      text={`Merci ! Ton abonnement Clipperie est actif. Ton accès arrive par email${email ? ` à ${email}` : ""}. Pendant le lancement, tes premiers clips sont prêts sous ${SITE.launchDeliveryDays} jours, sinon on te rembourse.`}
    >
      <ol className="mb-2 space-y-3 rounded-2xl border-2 border-encre bg-papier p-5 leading-snug shadow-[4px_4px_0_var(--color-encre)]">
        <li>
          <strong className="text-rec">1.</strong> Ouvre l’email d’accès
          Clipperie (pense à regarder dans les indésirables).
        </li>
        <li>
          <strong className="text-rec">2.</strong> Garde sous la main le lien
          d’un live Twitch ou d’une vidéo YouTube à clipper.
        </li>
        <li>
          <strong className="text-rec">3.</strong> Colle-le dans ton espace&nbsp;:
          tes clips arrivent, prêts à poster.
        </li>
      </ol>
    </StatusScreen>
  );
}
