import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { SITE } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { openPortal, signOut, submitVideo } from "./actions";

export const metadata: Metadata = {
  title: "Mon espace",
  robots: { index: false },
};

type Video = {
  id: string;
  source_type: "twitch" | "youtube" | "fichier";
  source_url: string | null;
  layout: "plein_ecran" | "facecam_jeu";
  status: string;
  error_message: string | null;
  duration_seconds: number | null;
  created_at: string;
};

type Subscription = {
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

const ERRORS: Record<string, string> = {
  lien: "Ce lien n’est pas reconnu. Colle le lien d’une rediffusion Twitch (twitch.tv/videos/…) ou d’une vidéo YouTube.",
  abonnement: "Ton abonnement n’est pas actif : réactive-le pour lancer une découpe.",
  file: "Tu as déjà 10 vidéos en attente. Attends que les premières soient prêtes.",
  technique: "Petit accroc de notre côté. Réessaie dans un instant.",
  portail: "Impossible d’ouvrir la gestion de l’abonnement pour l’instant. Réessaie dans un instant.",
};

const STATUS: Record<string, { label: string; detail: string }> = {
  en_attente: {
    label: "En file d’attente",
    detail: `Pendant le lancement, tes clips sont prêts sous ${SITE.launchDeliveryDays} jours.`,
  },
  telechargement: { label: "Récupération", detail: "On récupère la vidéo." },
  transcription: { label: "Transcription", detail: "On écoute tout le live." },
  analyse: { label: "Repérage", detail: "On cherche les meilleurs moments." },
  rendu: { label: "Découpe", detail: "On fabrique tes clips." },
  pret: { label: "Clips prêts", detail: "Tes clips t’attendent." },
  erreur: { label: "Erreur", detail: "Ce live n’a pas pu être découpé." },
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours} h ${String(minutes).padStart(2, "0")}`;
}

function displayUrl(url: string | null) {
  return url ? url.replace(/^https?:\/\/(www\.)?/, "") : "Fichier vidéo";
}

export default async function AppPage({ searchParams }: PageProps<"/app">) {
  await connection(); // page propre à chaque visiteur : jamais générée à l'avance
  if (!isSupabaseConfigured()) redirect("/connexion?erreur=config");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [{ data: subscription }, { data: videoRows }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, current_period_start, current_period_end, cancel_at_period_end")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<Subscription>(),
    supabase
      .from("videos")
      .select("id, source_type, source_url, layout, status, error_message, duration_seconds, created_at")
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<Video[]>(),
  ]);
  const videos = videoRows ?? [];

  const { ajoute, erreur } = await searchParams;
  const error = typeof erreur === "string" ? ERRORS[erreur] : undefined;

  const isActive = subscription && ["active", "trialing"].includes(subscription.status);
  const isPastDue = subscription?.status === "past_due" || subscription?.status === "unpaid";
  const periodStart = subscription?.current_period_start ?? null;
  const usedSeconds = videos
    .filter((v) => !periodStart || v.created_at >= periodStart)
    .filter((v) => v.status !== "erreur")
    .reduce((total, v) => total + (v.duration_seconds ?? 0), 0);
  const quotaSeconds = SITE.hoursPerMonth * 3600;
  const usedPercent = Math.min(100, Math.round((usedSeconds / quotaSeconds) * 100));

  return (
    <>
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 pt-5 md:px-8 md:pt-7">
        <Link href="/app" aria-label="Clipperie, mon espace">
          <Logo />
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="cursor-pointer py-2 text-sm font-semibold underline-offset-4 hover:underline"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-8 pb-20 md:px-8">
        {ajoute === "1" && (
          <p
            role="status"
            className="mb-6 rounded-2xl bg-surligneur px-4 py-3 font-semibold leading-snug"
          >
            C’est noté&nbsp;! Ton live est dans la file.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mb-6 rounded-2xl border-2 border-rec bg-papier px-4 py-3 leading-snug"
          >
            {error}
          </p>
        )}
        {isPastDue && (
          <div className="mb-6 rounded-2xl border-2 border-rec bg-papier p-4">
            <p className="font-semibold leading-snug">
              Ton dernier paiement n’est pas passé. Mets à jour ta carte pour
              garder l’accès.
            </p>
            <form action={openPortal} className="mt-3">
              <SubmitButton>Mettre à jour ma carte</SubmitButton>
            </form>
          </div>
        )}

        {/* Nouveau live : l'action principale de l'écran */}
        <section className="rounded-[2rem] border-2 border-encre bg-papier p-5 shadow-[6px_6px_0_var(--color-encre)] md:p-8">
          <h1 className="font-display text-3xl leading-tight font-extrabold text-balance md:text-4xl">
            {videos.length === 0
              ? "Colle le lien de ton premier live."
              : "Un nouveau live à clipper ?"}
          </h1>
          <p className="mt-3 leading-relaxed text-encre-douce">
            Rediffusion Twitch ou vidéo YouTube&nbsp;: Clipperie repère les
            meilleurs moments et en fait des clips d’une minute maximum,
            sous-titrés.
          </p>

          {isActive ? (
            <form action={submitVideo} className="mt-6 flex flex-col gap-5">
              <label className="flex flex-col gap-2 font-semibold">
                Lien du live
                <input
                  type="text"
                  name="url"
                  required
                  inputMode="url"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="twitch.tv/videos/…"
                  className="min-h-14 rounded-2xl border-2 border-encre bg-creme px-4 text-base font-normal placeholder:text-encre-douce/60"
                />
              </label>

              <fieldset>
                <legend className="font-semibold">Cadrage des clips</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <LayoutChoice
                    value="plein_ecran"
                    title="Plein écran"
                    text="La caméra filme le streamer (Just Chatting, podcast)."
                    defaultChecked
                  />
                  <LayoutChoice
                    value="facecam_jeu"
                    title="Facecam + jeu"
                    text="Webcam en haut, jeu en bas (streams gaming)."
                  />
                </div>
              </fieldset>

              <SubmitButton pendingLabel="Ajout du live…">Lancer la découpe</SubmitButton>
            </form>
          ) : (
            <div className="mt-6">
              <p className="mb-4 leading-snug font-semibold">
                Ton abonnement n’est pas actif. Réactive-le pour lancer tes découpes.
              </p>
              <CheckoutButton>S’abonner · {SITE.price}/mois</CheckoutButton>
            </div>
          )}
        </section>

        {/* Mes vidéos, ou le guide au premier passage */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-extrabold">Mes lives</h2>
          {videos.length === 0 ? (
            <ol className="mt-4 space-y-3">
              {[
                "Colle le lien d’une rediffusion Twitch ou d’une vidéo YouTube.",
                "Clipperie repère une trentaine de moments forts par tranche de deux heures.",
                "Tu télécharges tes clips sous-titrés et tu postes sur TikTok.",
              ].map((step, i) => (
                <li
                  key={step}
                  className="flex gap-4 rounded-2xl border-2 border-dashed border-encre/25 p-4 leading-snug"
                >
                  <span className="font-display text-xl font-extrabold text-rec tabular-nums">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          ) : (
            <ul className="mt-4 space-y-3">
              {videos.map((video) => {
                const status = STATUS[video.status] ?? STATUS.en_attente;
                return (
                  <li
                    key={video.id}
                    className="rounded-2xl border-2 border-encre bg-papier p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-md bg-encre px-2 py-0.5 text-xs font-bold text-creme uppercase">
                        {video.source_type === "twitch"
                          ? "Twitch"
                          : video.source_type === "youtube"
                            ? "YouTube"
                            : "Fichier"}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                          video.status === "erreur"
                            ? "bg-rec text-white"
                            : video.status === "pret"
                              ? "bg-surligneur text-encre"
                              : "bg-sable text-encre"
                        }`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-3 truncate font-semibold">{displayUrl(video.source_url)}</p>
                    <p className="mt-1 text-sm leading-snug text-encre-douce">
                      {video.status === "erreur" && video.error_message
                        ? video.error_message
                        : status.detail}{" "}
                      · {video.layout === "facecam_jeu" ? "Facecam + jeu" : "Plein écran"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Abonnement */}
        {subscription && (
          <section className="mt-12 rounded-3xl border-2 border-dashed border-encre/25 p-5">
            <h2 className="font-display text-2xl font-extrabold">Mon abonnement</h2>
            <p className="mt-2 leading-snug text-encre-douce">
              {isActive
                ? subscription.cancel_at_period_end && subscription.current_period_end
                  ? `Résilié : ton accès reste ouvert jusqu’au ${dateFormat.format(new Date(subscription.current_period_end))}.`
                  : subscription.current_period_end
                    ? `Actif · prochain renouvellement le ${dateFormat.format(new Date(subscription.current_period_end))}.`
                    : "Actif."
                : isPastDue
                  ? "Paiement en attente."
                  : "Inactif."}
            </p>
            {isActive && (
              <div className="mt-4">
                <div className="flex justify-between text-sm font-semibold tabular-nums">
                  <span>Utilisé ce mois-ci</span>
                  <span>
                    {formatDuration(usedSeconds)} sur {SITE.hoursPerMonth}&nbsp;h
                  </span>
                </div>
                <div
                  className="mt-2 h-3 overflow-hidden rounded-full bg-sable"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={usedPercent}
                  aria-label="Heures de live utilisées ce mois-ci"
                >
                  <div className="h-full rounded-full bg-rec" style={{ width: `${usedPercent}%` }} />
                </div>
              </div>
            )}
            <form action={openPortal} className="mt-5">
              <SubmitButton variant="secondary" pendingLabel="Ouverture…">
                Gérer ou résilier mon abonnement
              </SubmitButton>
            </form>
          </section>
        )}
      </main>
    </>
  );
}

function LayoutChoice({
  value,
  title,
  text,
  defaultChecked = false,
}: {
  value: string;
  title: string;
  text: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-2xl border-2 border-encre/25 bg-creme p-4 has-[:checked]:border-encre has-[:checked]:bg-surligneur/40">
      <input
        type="radio"
        name="layout"
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 size-5 shrink-0 accent-[var(--color-rec)]"
      />
      <span>
        <span className="block font-display font-extrabold">{title}</span>
        <span className="mt-1 block text-sm leading-snug text-encre-douce">{text}</span>
      </span>
    </label>
  );
}
