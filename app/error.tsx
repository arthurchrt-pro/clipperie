"use client";

import { useEffect } from "react";
import { StatusScreen } from "@/components/StatusScreen";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="Petit accroc"
      title="Quelque chose a coincé de notre côté."
      text="Ce n’est pas toi, c’est nous. Réessaie dans un instant : si ça recommence, reviens à l’accueil."
    >
      <button
        type="button"
        onClick={() => retry()}
        className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl bg-rec px-6 font-display text-lg font-extrabold text-white shadow-[0_4px_0_var(--color-encre)] transition hover:bg-rec-fonce active:translate-y-1 active:shadow-none"
      >
        Réessayer
      </button>
    </StatusScreen>
  );
}
