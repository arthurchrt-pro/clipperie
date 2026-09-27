import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { LEGAL } from "@/lib/site";
import { sendMagicLink } from "./actions";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi à ton espace Clipperie avec un lien reçu par email.",
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  email: "Cette adresse email ne semble pas valide. Vérifie-la et réessaie.",
  limite:
    "Trop de demandes d’un coup. Attends une minute, puis redemande ton lien.",
  lien: "Ce lien de connexion a expiré ou a déjà servi. Demande-en un nouveau ci-dessous.",
  acces:
    "L’accès direct n’a pas fonctionné. Reçois ton lien de connexion par email, ça prend une minute.",
  config: "La connexion n’est pas encore ouverte. Reviens très vite.",
  envoi:
    "L’email n’a pas pu partir, le souci vient de chez nous. Réessaie dans quelques minutes.",
};

export default async function Connexion({ searchParams }: PageProps<"/connexion">) {
  const { email, envoye, erreur } = await searchParams;
  const address = typeof email === "string" ? email : "";
  const error = typeof erreur === "string" ? ERRORS[erreur] : undefined;
  const sent = envoye === "1";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-12">
      <Link href="/" aria-label="Clipperie, retour à l’accueil" className="self-start">
        <Logo />
      </Link>

      {sent ? (
        <section className="mt-12">
          <p className="font-display text-sm font-extrabold tracking-[0.14em] text-rec uppercase">
            Lien envoyé
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-extrabold">
            Vérifie ta boîte mail.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-encre-douce">
            Si un compte Clipperie existe pour{" "}
            <strong className="text-encre">{address}</strong>, ton lien de
            connexion arrive dans une minute. Il est valable une heure.
          </p>
          <p className="mt-4 leading-relaxed text-encre-douce">
            Rien reçu&nbsp;? Regarde dans les indésirables, et vérifie que c’est
            bien l’adresse utilisée pour ton paiement.
          </p>
          <Link
            href={`/connexion?email=${encodeURIComponent(address)}`}
            className="mt-8 inline-block py-2 font-semibold underline underline-offset-4"
          >
            Renvoyer un lien
          </Link>
        </section>
      ) : (
        <section className="mt-12">
          <h1 className="font-display text-4xl leading-tight font-extrabold">
            Connexion à ton espace
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-encre-douce">
            Pas de mot de passe&nbsp;: indique l’email utilisé pour ton paiement,
            on t’envoie un lien pour entrer.
          </p>
          {error && (
            <p
              role="alert"
              className="mt-6 rounded-2xl border-2 border-rec bg-papier px-4 py-3 leading-snug"
            >
              {error}
            </p>
          )}
          <form action={sendMagicLink} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-2 font-semibold">
              Ton email
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                inputMode="email"
                defaultValue={address}
                placeholder="toi@exemple.fr"
                className="min-h-14 rounded-2xl border-2 border-encre bg-papier px-4 text-base font-normal placeholder:text-encre-douce/60"
              />
            </label>
            <SubmitButton pendingLabel="Envoi du lien…">
              Recevoir mon lien de connexion
            </SubmitButton>
          </form>
          <p className="mt-8 text-sm leading-relaxed text-encre-douce">
            Pas encore client&nbsp;?{" "}
            <Link href="/" className="font-semibold text-encre underline underline-offset-4">
              Découvre Clipperie
            </Link>
            . Un souci&nbsp;? Écris-nous à {LEGAL.email}.
          </p>
        </section>
      )}
    </main>
  );
}
