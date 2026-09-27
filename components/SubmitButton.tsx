"use client";

import { useFormStatus } from "react-dom";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";

// Bouton d'envoi de formulaire : se bloque pendant l'envoi pour éviter les doubles clics.
export function SubmitButton({
  children,
  pendingLabel = "Un instant…",
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={variant === "primary" ? buttonPrimary : buttonSecondary}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
