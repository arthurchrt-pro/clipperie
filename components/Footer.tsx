import Link from "next/link";
import { LEGAL } from "@/lib/site";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgv", label: "CGV" },
  { href: "/confidentialite", label: "Confidentialité" },
];

export function Footer() {
  return (
    <footer
      data-sticky-hide=""
      className="border-t-2 border-dashed border-encre/20"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <Link href="/" aria-label="Clipperie, retour à l’accueil">
          <Logo />
        </Link>
        <nav aria-label="Informations légales">
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-[15px] font-medium">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-block py-2 underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {LEGAL.email && (
              <li>
                <a
                  href={`mailto:${LEGAL.email}`}
                  className="inline-block py-2 underline-offset-4 hover:underline"
                >
                  Contact
                </a>
              </li>
            )}
          </ul>
        </nav>
        <p className="text-sm text-encre-douce">© 2026 Clipperie</p>
      </div>
    </footer>
  );
}
