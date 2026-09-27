import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { StatusScreen } from "@/components/StatusScreen";
import { SubmitButton } from "@/components/SubmitButton";
import { LEGAL, SITE } from "@/lib/site";
import { getStripe } from "@/lib/stripe";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/server";
import { buttonPrimary } from "@/lib/ui";
import { claimAccess } from "./actions";

export const metadata: Metadata = {
  title: "Merci",
  robots: { index: false },
};

// Page affichée après le paiement. Elle vérifie la session auprès de Stripe,
// mais n'active rien : l'activation passe uniquement par le webhook signé.
async function getPaidSession(sessionId: string | undefined) {
  const stripe = getStripe();
  if (!stripe || !sessionId?.startsWith("cs_")) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status !== "complete") return null;
    return { id: session.id, email: session.customer_details?.email ?? "" };
  } catch {
    return null;
  }
}

async function getActivation(sessionId: string) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SECRET_KEY) return null;
  const { data } = await createAdminClient()
    .from("subscriptions")
    .select("access_claimed_at")
    .eq("checkout_session_id", sessionId)
    .maybeSingle();
  return data ? { claimed: Boolean(data.access_claimed_at) } : { pending: true };
}

const launchPromise = `Pendant le lancement, tes premiers clips sont prêts sous ${SITE.launchDeliveryDays} jours, sinon on te rembourse.`;

export default async function Merci({ searchParams }: PageProps<"/merci">) {
  const { session_id } = await searchParams;
  const session = await getPaidSession(
    typeof session_id === "string" ? session_id : undefined,
  );

  if (!session) {
    return (
      <StatusScreen
        code="Vérification"
        title="On ne retrouve pas ce paiement."
        text={`Si ta carte a été débitée, pas d’inquiétude : écris-nous à ${LEGAL.email ?? "l’adresse indiquée dans les mentions légales"} et on règle ça rapidement.`}
      />
    );
  }

  const activation = await getActivation(session.id);
  const loginHref = `/connexion?email=${encodeURIComponent(session.email)}`;

  // Compte activé par le webhook : accès direct, une seule fois.
  if (activation && "claimed" in activation) {
    return (
      <StatusScreen
        code="Paiement confirmé"
        title="C’est dans la boîte."
        text={`Merci ! Ton abonnement Clipperie est actif. ${launchPromise}`}
      >
        {activation.claimed ? (
          <Link href={loginHref} className={buttonPrimary}>
            Me connecter à mon espace
          </Link>
        ) : (
          <form action={claimAccess}>
            <input type="hidden" name="session_id" value={session.id} />
            <SubmitButton pendingLabel="Ouverture de ton espace…">
              Ouvrir mon espace Clipperie
            </SubmitButton>
          </form>
        )}
      </StatusScreen>
    );
  }

  // Paiement accepté, confirmation du webhook en cours (quelques secondes).
  if (activation && "pending" in activation) {
    return (
      <StatusScreen
        code="Paiement accepté"
        title="On prépare ton espace…"
        text={`Stripe confirme ton paiement, ça prend quelques secondes. Cette page se met à jour toute seule. Si rien ne bouge d’ici une minute, reçois ton lien d’accès par email${session.email ? ` à ${session.email}` : ""}.`}
      >
        <AutoRefresh />
        <Link href={loginHref} className={buttonPrimary}>
          Recevoir mon lien par email
        </Link>
      </StatusScreen>
    );
  }

  // Base de données pas encore branchée.
  return (
    <StatusScreen
      code="Paiement confirmé"
      title="C’est dans la boîte."
      text={`Merci ! Ton abonnement Clipperie est actif. Ton accès arrive par email${session.email ? ` à ${session.email}` : ""}. ${launchPromise}`}
    />
  );
}
