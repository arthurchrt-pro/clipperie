import Link from "next/link";
import { Logo } from "./Logo";

// Écran commun aux pages 404, erreur et attente : jamais de cul-de-sac, toujours un retour à l'accueil.
export function ErrorScreen({
  code,
  title,
  text,
  children,
}: {
  code: string;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <Link href="/" aria-label="Clipperie, retour à l’accueil" className="self-start">
        <Logo />
      </Link>
      <p className="mt-12 font-display text-sm font-extrabold tracking-[0.14em] text-rec uppercase tabular-nums">
        {code}
      </p>
      <h1 className="mt-3 font-display text-4xl leading-tight font-extrabold text-balance">
        {title}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-encre-douce">{text}</p>
      <div className="mt-8 flex flex-col gap-3">
        {children}
        <Link
          href="/"
          className="flex min-h-14 items-center justify-center rounded-2xl border-2 border-encre bg-papier px-6 font-display text-lg font-extrabold shadow-[0_4px_0_var(--color-encre)] transition active:translate-y-1 active:shadow-none"
        >
          Retour à l’accueil
        </Link>
      </div>
    </main>
  );
}
