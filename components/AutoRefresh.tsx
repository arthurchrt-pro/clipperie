"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Recharge la page toutes les 2 secondes, le temps que Stripe confirme le paiement.
export function AutoRefresh({ maxTries = 15 }: { maxTries?: number }) {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (tries > maxTries) clearInterval(timer);
      else router.refresh();
    }, 2000);
    return () => clearInterval(timer);
  }, [router, maxTries]);
  return null;
}
