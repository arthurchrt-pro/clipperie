"use client";

import { useState } from "react";

// Copie un texte (l'accroche d'un clip) dans le presse-papiers.
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border-2 border-encre px-3 text-sm font-bold"
    >
      {copied ? "Copiée ✓" : "Copier l’accroche"}
    </button>
  );
}
