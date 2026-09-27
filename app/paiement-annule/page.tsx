import type { Metadata } from "next";
import { CheckoutButton } from "@/components/CheckoutButton";
import { StatusScreen } from "@/components/StatusScreen";

export const metadata: Metadata = {
  title: "Paiement non abouti",
  robots: { index: false },
};

export default async function PaiementAnnule({
  searchParams,
}: PageProps<"/paiement-annule">) {
  const { ref } = await searchParams;
  const reference =
    typeof ref === "string" ? ref.replace(/[^\w.-]/g, "").slice(0, 60) : "";

  return (
    <StatusScreen
      code="Paiement non abouti"
      title="Aucun montant n’a été débité."
      text="Le paiement a été interrompu ou n’a pas pu aboutir. Tu peux réessayer maintenant : ça prend moins d’une minute."
    >
      <CheckoutButton>Réessayer le paiement</CheckoutButton>
      {reference && (
        <p className="order-last text-center text-sm text-encre-douce">
          Référence de l’erreur&nbsp;: <code>{reference}</code>
        </p>
      )}
    </StatusScreen>
  );
}
