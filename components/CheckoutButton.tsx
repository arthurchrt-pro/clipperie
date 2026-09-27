import { SubmitButton } from "./SubmitButton";

// Bouton de paiement : un simple formulaire POST vers la création de la session Stripe.
// `stickyHide` signale à la barre d'action mobile qu'elle peut se cacher quand ce bouton est visible.
export function CheckoutButton({
  children,
  stickyHide = false,
  className = "",
}: {
  children: React.ReactNode;
  stickyHide?: boolean;
  className?: string;
}) {
  return (
    <form
      action="/api/checkout"
      method="post"
      className={className}
      data-sticky-hide={stickyHide ? "" : undefined}
    >
      <SubmitButton pendingLabel="Ouverture du paiement…">{children}</SubmitButton>
    </form>
  );
}
