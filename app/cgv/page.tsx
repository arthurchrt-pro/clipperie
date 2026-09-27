import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { Todo } from "@/components/Todo";
import { pageMetadata } from "@/lib/metadata";
import { LEGAL, SITE } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Conditions générales de vente · Clipperie",
  description:
    "Conditions générales de vente de l’abonnement Clipperie : prix, paiement, résiliation, rétractation.",
  path: "/cgv",
});

export default function Cgv() {
  return (
    <LegalPage title="Conditions générales de vente" updated="27 septembre 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions générales de vente (CGV) encadrent
        l’abonnement au service Clipperie, édité par{" "}
        <Todo value={LEGAL.editeur} label="prénom et nom" />, entrepreneur
        individuel (EI), SIRET <Todo value={LEGAL.siret} label="numéro SIRET" />
        , ci-après «&nbsp;Clipperie&nbsp;». Elles s’appliquent à toute
        souscription, par un particulier ou un professionnel, ci-après «&nbsp;le
        client&nbsp;».
      </p>

      <h2>2. Le service</h2>
      <p>Clipperie transforme des vidéos longues en clips verticaux courts&nbsp;:</p>
      <ul>
        <li>
          lien vers une vidéo (live Twitch, vidéo YouTube) ou dépôt d’un fichier
          vidéo&nbsp;;
        </li>
        <li>transcription automatique de la parole&nbsp;;</li>
        <li>repérage automatique des moments forts&nbsp;;</li>
        <li>découpe en clips verticaux de 60&nbsp;secondes maximum&nbsp;;</li>
        <li>sous-titres incrustés et titre proposé pour chaque clip&nbsp;;</li>
        <li>export des clips, un par un ou tous ensemble.</li>
      </ul>
      <p>
        Les traitements sont automatiques. Le client relit ses clips avant de
        les publier&nbsp;: une transcription peut contenir des erreurs,
        notamment sur les noms propres ou en cas de son de mauvaise qualité.
      </p>
      <p>
        Une vidéo fournie par lien doit être accessible publiquement. Si une
        plateforme empêche sa récupération (rediffusion Twitch expirée, vidéo
        privée ou bloquée), le client est invité à déposer le fichier vidéo à
        la place&nbsp;; aucun clip n’est décompté de son quota.
      </p>

      <h2>3. Prix et quota</h2>
      <p>
        L’abonnement coûte <strong>{SITE.price} par mois</strong>. {LEGAL.tva}{" "}
        Il donne droit à <strong>{SITE.clipsPerMonth} clips par période
        mensuelle</strong>. Les clips non utilisés ne sont pas reportés sur la
        période suivante.
      </p>
      <p>
        Clipperie peut faire évoluer ses prix. Tout changement est annoncé par
        email au moins 30&nbsp;jours à l’avance et ne s’applique qu’à la période
        suivante&nbsp;; le client peut résilier avant son entrée en vigueur.
      </p>

      <h2>4. Offre de lancement</h2>
      <p>
        Pendant la phase de lancement, la découpe automatique est en cours de
        mise en service. Les premiers clips du client lui sont livrés{" "}
        <strong>
          au plus tard {SITE.launchDeliveryDays}&nbsp;jours après son premier
          paiement
        </strong>
        . À défaut, Clipperie rembourse intégralement ce paiement sur simple
        demande par email.
      </p>

      <h2>5. Commande et paiement</h2>
      <p>
        La souscription se fait en ligne. Le paiement est traité par Stripe,
        prestataire de paiement sécurisé&nbsp;: Clipperie n’a jamais accès aux
        numéros de carte. Le premier mois est payé à la souscription, puis
        l’abonnement est prélevé automatiquement chaque mois à la même date.
      </p>
      <p>
        En cas d’échec de paiement, Stripe fait de nouvelles tentatives. Si le
        paiement n’aboutit pas, l’accès au service est suspendu jusqu’à
        régularisation.
      </p>

      <h2>6. Accès au service</h2>
      <p>
        Un compte est créé automatiquement à partir de l’adresse email utilisée
        lors du paiement. Le client s’y connecte par un lien de connexion envoyé
        à cette adresse. Il est responsable de la confidentialité de l’accès à
        sa boîte email.
      </p>
      <p>
        Le client déclare être majeur ou, s’il est mineur, disposer de
        l’autorisation de son représentant légal pour souscrire.
      </p>

      <h2>7. Essai gratuit</h2>
      <p>
        Lorsqu’un essai gratuit est proposé, il porte sur une seule vidéo, sans
        carte bancaire. La vidéo est entièrement analysée&nbsp;; trois clips
        sont téléchargeables, les autres le deviennent en s’abonnant.
      </p>

      <h2>8. Durée et résiliation</h2>
      <p>
        L’abonnement est <strong>sans engagement</strong>. Le client le résilie
        à tout moment, en ligne, depuis son espace, rubrique «&nbsp;Résilier
        mon abonnement&nbsp;», ou par email. La résiliation prend effet à la fin
        de la période mensuelle en cours&nbsp;: le client garde l’accès
        jusqu’à cette date, et aucun nouveau prélèvement n’a lieu.
      </p>

      <h2>9. Droit de rétractation</h2>
      <p>
        Le client consommateur dispose d’un délai de 14&nbsp;jours à compter de
        la souscription pour se rétracter, sans avoir à se justifier, en
        envoyant le formulaire ci-dessous ou toute déclaration claire par email
        à <Todo value={LEGAL.email} label="email de contact" />.
      </p>
      <p>
        S’il a demandé à utiliser le service avant la fin de ce délai et se
        rétracte ensuite, il paie un montant proportionnel au service fourni
        jusqu’à sa rétractation (article L221-25 du Code de la consommation).
        Le remboursement intervient dans les 14&nbsp;jours, par le moyen de
        paiement utilisé.
      </p>
      <h3>Formulaire de rétractation</h3>
      <p>
        À l’attention de <Todo value={LEGAL.editeur} label="prénom et nom" />,
        Clipperie, <Todo value={LEGAL.adresse} label="adresse postale" />,{" "}
        <Todo value={LEGAL.email} label="email de contact" />&nbsp;:
      </p>
      <p>
        Je vous notifie par la présente ma rétractation du contrat portant sur
        l’abonnement Clipperie, souscrit le&nbsp;[date], au nom de&nbsp;[nom],
        avec l’adresse email&nbsp;[email]. Date et signature (en cas d’envoi
        papier).
      </p>

      <h2>10. Contenus du client</h2>
      <p>
        Clipperie est un outil de découpe. Le client ne l’utilise que sur des
        vidéos dont il est l’auteur, ou pour lesquelles il dispose de
        l’autorisation du titulaire des droits, par exemple un streamer qui
        autorise le clipping de ses lives ou qui organise une campagne de
        clipping. Le client est seul responsable du respect de ces droits et de
        la publication de ses clips, notamment au regard des règles des
        plateformes où il les publie.
      </p>
      <p>
        Clipperie ne revendique aucun droit sur les vidéos ni sur les clips. Le
        client lui accorde le seul droit de les traiter pour fournir le
        service.
      </p>
      <p>
        Sont interdits les contenus illicites, haineux, violents ou portant
        atteinte aux droits d’un tiers. Tout titulaire de droits peut signaler
        un contenu à <Todo value={LEGAL.email} label="email de contact" />.
        Clipperie retire promptement le contenu signalé et peut suspendre le
        compte concerné, définitivement en cas de manquements répétés.
      </p>
      <p>
        Clipperie n’est ni affilié à Twitch, YouTube ou TikTok, ni approuvé par
        ces plateformes.
      </p>

      <h2>11. Conservation des fichiers</h2>
      <p>
        Les vidéos déposées sont supprimées {LEGAL.sourceRetentionDays}&nbsp;jours
        après leur traitement. Les clips restent téléchargeables pendant{" "}
        {LEGAL.clipRetentionDays}&nbsp;jours après leur création&nbsp;: le client
        les télécharge pour les conserver.
      </p>

      <h2>12. Garanties et responsabilité</h2>
      <p>
        Clipperie met tout en œuvre pour fournir un service disponible et de
        qualité, dans le cadre d’une obligation de moyens. Le client
        consommateur bénéficie de la garantie légale de conformité des contenus
        et services numériques (articles L224-25-12 et suivants du Code de la
        consommation).
      </p>
      <p>
        Pour un client professionnel, la responsabilité de Clipperie est
        limitée aux sommes payées au cours des douze derniers mois.
      </p>

      <h2>13. Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans la{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>14. Réclamations et médiation</h2>
      <p>
        Pour toute réclamation, écris à{" "}
        <Todo value={LEGAL.email} label="email de contact" />. Si aucune
        solution n’est trouvée, le client consommateur peut recourir
        gratuitement au médiateur de la consommation suivant&nbsp;:{" "}
        <Todo value={LEGAL.mediateur} label="nom et site du médiateur" />.
      </p>

      <h2>15. Droit applicable</h2>
      <p>
        Les présentes CGV sont soumises au droit français. À défaut d’accord
        amiable, le litige est porté devant les tribunaux compétents. Pour un
        client professionnel, sont seuls compétents les tribunaux du ressort du
        domicile de l’éditeur.
      </p>
    </LegalPage>
  );
}
