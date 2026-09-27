import { LegalPage } from "@/components/LegalPage";
import { Todo } from "@/components/Todo";
import { pageMetadata } from "@/lib/metadata";
import { LEGAL } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Politique de confidentialité · Clipperie",
  description:
    "Quelles données Clipperie collecte, pourquoi, combien de temps, et comment exercer tes droits.",
  path: "/confidentialite",
});

const PROCESSORS = [
  ["Vercel", "hébergement du site", "États-Unis"],
  ["Supabase", "base de données et connexion", "Union européenne"],
  ["Stripe", "paiement et facturation", "Union européenne et États-Unis"],
  ["Resend", "envoi des emails de connexion", "États-Unis"],
  ["Cloudflare", "stockage des vidéos et des clips", "Union européenne"],
  ["Trigger.dev", "traitement des vidéos", "Union européenne et États-Unis"],
  ["Groq", "transcription de la parole", "États-Unis"],
  ["Anthropic", "repérage des moments forts et titres", "États-Unis"],
];

export default function Confidentialite() {
  return (
    <LegalPage title="Politique de confidentialité" updated="27 septembre 2026">
      <p>
        Cette page explique quelles données Clipperie collecte, pourquoi, et
        comment tu gardes la main dessus.
      </p>

      <h2>Responsable du traitement</h2>
      <p>
        <Todo value={LEGAL.editeur} label="prénom et nom" />, entrepreneur
        individuel (EI), éditeur de Clipperie. Contact&nbsp;:{" "}
        <Todo value={LEGAL.email} label="email de contact" />.
      </p>

      <h2>Les données collectées</h2>
      <ul>
        <li>
          <strong>Ton adresse email</strong>, pour créer ton compte et te
          connecter.
        </li>
        <li>
          <strong>Tes informations de paiement</strong>, traitées directement
          par Stripe. Clipperie ne voit jamais ton numéro de carte.
        </li>
        <li>
          <strong>Tes vidéos, leurs transcriptions et tes clips</strong>, pour
          fournir le service.
        </li>
        <li>
          <strong>Des statistiques de visite anonymes</strong>, sans cookie ni
          identifiant personnel, pour savoir combien de visiteurs deviennent
          clients.
        </li>
      </ul>

      <h2>Pourquoi, et sur quelle base</h2>
      <ul>
        <li>
          Fournir le service, gérer ton compte et ton abonnement&nbsp;:
          exécution du contrat.
        </li>
        <li>
          Conserver les factures&nbsp;: obligation légale.
        </li>
        <li>
          Sécuriser le service et mesurer l’audience de façon anonyme&nbsp;:
          intérêt légitime.
        </li>
      </ul>
      <p>
        Tes vidéos ne sont jamais utilisées pour autre chose que produire tes
        clips, ni vendues, ni partagées avec d’autres utilisateurs.
      </p>

      <h2>Combien de temps</h2>
      <ul>
        <li>
          Vidéos déposées&nbsp;: {LEGAL.sourceRetentionDays}&nbsp;jours après leur
          traitement.
        </li>
        <li>
          Clips et transcriptions&nbsp;: {LEGAL.clipRetentionDays}&nbsp;jours après
          leur création.
        </li>
        <li>
          Compte&nbsp;: tant que ton abonnement est actif, puis 3&nbsp;ans après
          ton dernier contact.
        </li>
        <li>Factures&nbsp;: 10&nbsp;ans, comme la loi l’exige.</li>
      </ul>

      <h2>Les prestataires</h2>
      <p>
        Clipperie s’appuie sur des prestataires techniques qui traitent tes
        données uniquement pour son compte&nbsp;:
      </p>
      <ul>
        {PROCESSORS.map(([name, role, location]) => (
          <li key={name}>
            <strong>{name}</strong>&nbsp;: {role} ({location})
          </li>
        ))}
      </ul>
      <p>
        Les transferts hors de l’Union européenne sont encadrés par le cadre de
        protection des données UE–États-Unis (Data Privacy Framework) ou par les
        clauses contractuelles types de la Commission européenne.
      </p>

      <h2>Cookies</h2>
      <p>
        Clipperie n’utilise qu’un cookie strictement nécessaire&nbsp;: celui qui
        garde ta session ouverte quand tu es connecté. La mesure d’audience
        fonctionne sans cookie. Aucun bandeau de consentement n’est donc
        nécessaire.
      </p>

      <h2>Tes droits</h2>
      <p>
        Tu peux accéder à tes données, les corriger, les supprimer, en limiter
        l’usage, t’opposer à leur traitement ou les récupérer. Écris à{" "}
        <Todo value={LEGAL.email} label="email de contact" />, réponse sous un
        mois. Si tu estimes que tes droits ne sont pas respectés, tu peux saisir
        la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>).
      </p>
    </LegalPage>
  );
}
