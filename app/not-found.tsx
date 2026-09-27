import type { Metadata } from "next";
import { ErrorScreen } from "@/components/ErrorScreen";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <ErrorScreen
      code="Erreur 404"
      title="Cette page a été coupée au montage."
      text="Le lien est peut-être incomplet, ou la page a changé d’adresse. Tout le reste t’attend sur l’accueil."
    />
  );
}
