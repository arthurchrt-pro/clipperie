import type { Metadata } from "next";
import { ErrorScreen } from "@/components/ErrorScreen";

// Page provisoire : le bouton de paiement y mène tant que Stripe n'est pas branché (étape 2).
export const metadata: Metadata = {
  title: "Ouverture imminente",
  robots: { index: false },
};

export default function Bientot() {
  return (
    <ErrorScreen
      code="Ouverture imminente"
      title="Le paiement ouvre dans quelques jours."
      text="Clipperie se prépare pour ses premiers clients. Reviens très vite : tu pourras t’abonner en moins d’une minute."
    />
  );
}
