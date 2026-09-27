import { CheckoutButton } from "@/components/CheckoutButton";
import { HeroVisual } from "@/components/HeroVisual";
import { Logo } from "@/components/Logo";
import { StickyCta } from "@/components/StickyCta";
import { pageMetadata } from "@/lib/metadata";
import { SITE } from "@/lib/site";

export const metadata = pageMetadata({
  title: `${SITE.name} — ${SITE.promise}`,
  description: SITE.description,
  path: "/",
});

const BENEFITS = [
  {
    step: "01 · Repérer",
    title: "Les meilleurs moments, trouvés pour toi",
    text: "Clipperie écoute toute ta vidéo et garde les passages qui tiennent tout seuls : une idée forte, une anecdote, une chute. Une minute maximum chacun, le format qui marche sur TikTok.",
  },
  {
    step: "02 · Sous-titrer",
    title: "Des clips qui se comprennent sans le son",
    text: "Chaque clip est recadré à la verticale et sous-titré mot à mot, ponctuation comprise. Un titre t’est proposé pour chacun.",
  },
  {
    step: "03 · Publier",
    title: "Tout est prêt, d’un seul coup",
    text: "Tu télécharges tous tes clips en une fois, avec leurs titres. Il ne te reste qu’à les publier sur TikTok, et même sur Reels et Shorts.",
  },
];

const FEATURES = [
  "Un lien Twitch ou YouTube suffit",
  "Repérage des moments forts",
  "Clips verticaux d’une minute maximum",
  "Sous-titres incrustés et titre proposé",
  "Export de tous tes clips en une fois",
];

const FAQ = [
  {
    question: "Quelles vidéos puis-je utiliser ?",
    answer:
      "Colle le lien d’un live Twitch (tant que la rediffusion est en ligne) ou d’une vidéo YouTube. Tout ce qui est parlé fonctionne : lives, podcasts, formations. Tu peux aussi déposer un fichier vidéo.",
  },
  {
    question: "Combien de temps faut-il attendre ?",
    answer: `Pendant le lancement, tes premiers clips arrivent sous ${SITE.launchDeliveryDays} jours, sinon on te rembourse. Ensuite, c’est automatique : un live de deux heures est prêt en général en moins d’une heure.`,
  },
  {
    question: "Et si je veux arrêter ?",
    answer:
      "Tu résilies en ligne, quand tu veux. Pas d’engagement, pas de frais cachés.",
  },
  {
    question: "Dans quelles langues ?",
    answer:
      "Le français d’abord, soigné jusqu’à la ponctuation. L’anglais, l’espagnol et la plupart des autres langues fonctionnent aussi.",
  },
];

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold tracking-[0.14em] text-rec uppercase">
      {children}
    </p>
  );
}

function Scissors({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.1 8.1 20 20M8.1 15.9 20 4" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-5 md:px-8 md:pt-7">
        <Logo />
        <span className="text-sm font-semibold text-encre-douce tabular-nums">
          {SITE.price}/mois
        </span>
      </header>

      <main className="flex-1">
        {/* Promesse */}
        <section className="mx-auto grid max-w-5xl gap-12 px-4 pt-8 pb-16 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-14 md:px-8 md:pt-16 md:pb-24">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.08em] text-encre-douce uppercase md:text-sm md:tracking-[0.14em]">
              Podcasteurs, streamers, formateurs
            </p>
            <h1 className="mt-3 font-display text-[2.55rem] leading-[1.03] font-extrabold tracking-tight text-balance md:text-[3.6rem]">
              Un live de deux heures devient{" "}
              <span className="surligne">trente clips</span> verticaux.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-encre-douce md:text-xl">
              Colle le lien de ton live Twitch ou de ta vidéo YouTube.
              Clipperie en tire des clips TikTok d’une minute maximum,{" "}
              <span className="whitespace-nowrap">sous-titrés</span>. Tu n’as
              plus qu’à publier.
            </p>
            <div className="mt-7 md:max-w-sm">
              <CheckoutButton stickyHide>
                Commencer · {SITE.price}/mois
              </CheckoutButton>
              <p className="mt-3 text-center text-sm leading-relaxed text-encre-douce md:text-left">
                Sans engagement · Résiliable en ligne
                <br />
                Premiers clips sous {SITE.launchDeliveryDays}&nbsp;jours, sinon
                remboursé
              </p>
            </div>
          </div>
          <HeroVisual />
        </section>

        {/* La douleur, chiffrée */}
        <section className="bg-encre text-creme">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:gap-16 md:px-8 md:py-24">
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-surligneur uppercase">
                Le problème
              </p>
              <h2 className="mt-3 font-display text-3xl leading-tight font-extrabold text-balance md:text-5xl">
                Découper un live à la main, c’est une journée entière.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-creme/80">
                Repérer le bon passage, couper, recadrer, sous-titrer, trouver
                un titre&nbsp;: un quart d’heure par clip, au bas mot. Alors la
                vidéo dort sur ton disque, et le format court, le seul qui
                t’amène de nouvelles audiences, reste vide.
              </p>
            </div>
            <div className="font-display font-extrabold tabular-nums">
              <p className="sr-only">
                30 clips fois 15 minutes par clip, soit 7 heures 30 de découpe.
              </p>
              <div aria-hidden>
                <div className="flex items-baseline gap-4 border-b border-dashed border-creme/25 pb-3">
                  <span className="w-8" />
                  <span className="text-5xl md:text-6xl">
                    30 <span className="text-xl text-creme/70">clips</span>
                  </span>
                </div>
                <div className="flex items-baseline gap-4 border-b border-dashed border-creme/25 py-3">
                  <span className="w-8 text-3xl text-creme/40">×</span>
                  <span className="text-5xl md:text-6xl">
                    15 <span className="text-xl text-creme/70">min par clip</span>
                  </span>
                </div>
                <div className="flex items-baseline gap-4 pt-3">
                  <span className="w-8 text-3xl text-creme/40">=</span>
                  <span className="text-5xl md:text-6xl">
                    <span className="surligne">7&nbsp;h&nbsp;30</span>{" "}
                    <span className="text-xl text-creme/70">de découpe</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Les trois bénéfices */}
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <Kicker>Ce que fait Clipperie</Kicker>
          <h2 className="mt-3 font-display text-3xl leading-tight font-extrabold text-balance md:text-5xl">
            Tu parles. Clipperie découpe.
          </h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit.step}
                className="rounded-3xl border-2 border-encre bg-papier p-6 shadow-[4px_4px_0_var(--color-encre)]"
              >
                <p className="text-sm font-bold text-rec tabular-nums">
                  {benefit.step}
                </p>
                <h3 className="mt-3 font-display text-xl leading-snug font-extrabold">
                  {benefit.title}
                </h3>
                <p className="mt-2 leading-relaxed text-encre-douce">
                  {benefit.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* L'offre */}
        <section id="offre" className="scroll-mt-6 px-4 pb-16 md:pb-24">
          <div className="mx-auto max-w-md rounded-[2rem] border-2 border-encre bg-papier p-6 shadow-[6px_6px_0_var(--color-encre)] md:p-8">
            <Kicker>Une seule offre</Kicker>
            <p className="mt-3 font-display font-extrabold tabular-nums">
              <span className="text-6xl">{SITE.price}</span>
              <span className="text-xl text-encre-douce">&nbsp;/&nbsp;mois</span>
            </p>
            <p className="mt-3 text-lg leading-snug">
              <strong>{SITE.clipsPerMonth} clips par mois</strong>&nbsp;: de quoi
              découper un épisode par semaine.
            </p>
            <ul className="mt-6 space-y-3">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex gap-3 leading-snug">
                  <Scissors className="mt-0.5 size-5 shrink-0 text-rec" />
                  {feature}
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-2xl bg-surligneur px-4 py-3 leading-snug">
              <strong>Offre de lancement&nbsp;:</strong> tes premiers clips sous{" "}
              {SITE.launchDeliveryDays}&nbsp;jours, sinon on te rembourse.
            </p>
            <CheckoutButton stickyHide className="mt-6">
              Commencer maintenant
            </CheckoutButton>
            <p className="mt-3 text-center text-sm text-encre-douce">
              Sans engagement. Paiement sécurisé par Stripe.
            </p>
          </div>
        </section>

        {/* Questions fréquentes */}
        <section className="mx-auto max-w-2xl px-4 pb-20 md:pb-28">
          <h2 className="font-display text-2xl font-extrabold md:text-3xl">
            Questions fréquentes
          </h2>
          <div className="mt-6 divide-y-2 divide-dashed divide-encre/15 border-y-2 border-dashed border-encre/15">
            {FAQ.map((item) => (
              <details key={item.question} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    aria-hidden
                    className="font-display text-2xl text-rec transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-5 leading-relaxed text-encre-douce">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <StickyCta>
        <CheckoutButton>Commencer · {SITE.price}/mois</CheckoutButton>
      </StickyCta>
    </>
  );
}
