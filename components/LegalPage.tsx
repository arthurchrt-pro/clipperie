import Link from "next/link";
import { Logo } from "./Logo";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-5 md:px-8 md:pt-7">
        <Link href="/" aria-label="Clipperie, retour à l’accueil">
          <Logo />
        </Link>
        <Link
          href="/"
          className="inline-block py-2 text-sm font-semibold underline-offset-4 hover:underline"
        >
          ← Accueil
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-10 pb-20 md:px-8">
        <h1 className="font-display text-4xl leading-tight font-extrabold md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-encre-douce">
          Dernière mise à jour&nbsp;: {updated}
        </p>
        <div className="legal mt-6 text-[17px]">{children}</div>
      </main>
    </>
  );
}
