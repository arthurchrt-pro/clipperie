// Bouton de paiement : un simple formulaire POST, sans JavaScript côté navigateur.
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
      <button
        type="submit"
        className="flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-rec px-6 font-display text-lg font-extrabold text-white shadow-[0_4px_0_var(--color-encre)] transition hover:bg-rec-fonce active:translate-y-1 active:shadow-none"
      >
        {children}
      </button>
    </form>
  );
}
