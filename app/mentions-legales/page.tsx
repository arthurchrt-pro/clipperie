import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { Todo } from "@/components/Todo";
import { pageMetadata } from "@/lib/metadata";
import { HOST, LEGAL } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Mentions légales · Clipperie",
  description: "Éditeur, hébergeur et informations légales du site Clipperie.",
  path: "/mentions-legales",
});

export default function MentionsLegales() {
  return (
    <LegalPage title="Mentions légales" updated="27 septembre 2026">
      <h2>Éditeur du site</h2>
      <p>
        Le site Clipperie est édité par{" "}
        <Todo value={LEGAL.editeur} label="prénom et nom" />, entrepreneur
        individuel (EI) exerçant sous le régime de la micro-entreprise, sous le
        nom commercial «&nbsp;Clipperie&nbsp;».
      </p>
      <ul>
        <li>
          SIRET&nbsp;: <Todo value={LEGAL.siret} label="numéro SIRET" />
        </li>
        <li>
          Adresse&nbsp;: <Todo value={LEGAL.adresse} label="adresse postale" />
        </li>
        <li>
          Email&nbsp;: <Todo value={LEGAL.email} label="email de contact" />
        </li>
        <li>{LEGAL.tva}</li>
      </ul>
      <p>
        Directeur de la publication&nbsp;:{" "}
        <Todo value={LEGAL.editeur} label="prénom et nom" />.
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par {HOST.name}, {HOST.address} (
        <a href={HOST.url}>{HOST.url.replace("https://", "")}</a>).
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les textes, visuels, logos et éléments graphiques du site Clipperie sont
        protégés par le droit d’auteur. Toute reproduction sans autorisation
        préalable est interdite.
      </p>
      <p>
        Les vidéos déposées par les utilisateurs, et les clips qui en sont tirés,
        restent la propriété de leurs auteurs. Clipperie ne revendique aucun
        droit sur ces contenus.
      </p>

      <h2>Marques</h2>
      <p>
        Twitch, YouTube et TikTok sont des marques de leurs propriétaires
        respectifs. Clipperie n’est ni affilié à ces plateformes, ni approuvé
        par elles.
      </p>

      <h2>Signaler un contenu</h2>
      <p>
        Si un contenu traité avec Clipperie porte atteinte à tes droits,
        écris à <Todo value={LEGAL.email} label="email de contact" /> en
        indiquant le contenu concerné et tes droits sur celui-ci. Il sera
        retiré dans les meilleurs délais.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement de tes données est décrit dans la{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question sur le site ou le service&nbsp;:{" "}
        <Todo value={LEGAL.email} label="email de contact" />.
      </p>
    </LegalPage>
  );
}
