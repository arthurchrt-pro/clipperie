"use client";

import { useEffect, useState } from "react";

// Barre d'action fixée en bas de l'écran sur mobile, à portée de pouce.
// Elle se cache dès qu'un autre bouton de paiement (ou le pied de page) est visible.
export function StickyCta({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const targets = document.querySelectorAll("[data-sticky-hide]");
    const onScreen = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      setVisible(onScreen.size === 0);
    });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      inert={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t-2 border-encre bg-creme px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      {children}
    </div>
  );
}
