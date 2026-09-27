"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Recharge régulièrement la page, le temps qu'une opération se termine
// (confirmation d'un paiement, découpe d'un live).
export function AutoRefresh({
  maxTries = 15,
  intervalMs = 2000,
}: {
  maxTries?: number;
  intervalMs?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (tries > maxTries) clearInterval(timer);
      else router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, maxTries, intervalMs]);
  return null;
}
