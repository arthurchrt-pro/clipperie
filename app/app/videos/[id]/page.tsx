import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CopyButton } from "@/components/CopyButton";
import { Logo } from "@/components/Logo";
import { isStorageConfigured, signedUrl, storageKeys } from "@/engine/storage";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimary } from "@/lib/ui";
import { IN_PROGRESS, STATUS } from "@/lib/videoStatus";

export const metadata: Metadata = {
  title: "Mes clips",
  robots: { index: false },
};

type Clip = {
  id: string;
  start_seconds: number;
  end_seconds: number;
  title: string | null;
  score: number | null;
  file_path: string | null;
  unlocked: boolean;
};

function timecode(seconds: number) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function fileName(text: string) {
  return text.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "clip";
}

export default async function VideoClips({ params }: PageProps<"/app/videos/[id]">) {
  await connection();
  if (!isSupabaseConfigured()) redirect("/connexion?erreur=config");
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: video } = await supabase
    .from("videos")
    .select("id, user_id, title, source_url, status, error_message, layout")
    .eq("id", id)
    .maybeSingle();
  if (!video) notFound();

  const { data: clipRows } = await supabase
    .from("clips")
    .select("id, start_seconds, end_seconds, title, score, file_path, unlocked")
    .eq("video_id", id)
    .not("file_path", "is", null)
    .order("score", { ascending: false })
    .returns<Clip[]>();
  const clips = clipRows ?? [];
  const storageReady = isStorageConfigured();

  const withUrls = storageReady
    ? await Promise.all(
        clips.map(async (clip, index) => {
          const name = `${String(index + 1).padStart(2, "0")} - ${fileName(clip.title ?? "clip")}.mp4`;
          return {
            ...clip,
            playUrl: await signedUrl(clip.file_path!),
            downloadUrl: await signedUrl(clip.file_path!, name),
            posterUrl: await signedUrl(storageKeys.thumbnail(video.user_id, video.id, clip.id)),
          };
        }),
      )
    : [];
  const archiveUrl =
    storageReady && video.status === "pret"
      ? await signedUrl(storageKeys.archive(video.user_id, video.id), `clipperie-${fileName(video.title ?? "clips")}.zip`)
      : null;

  const status = STATUS[video.status] ?? STATUS.en_attente;
  const inProgress = IN_PROGRESS.includes(video.status);

  return (
    <>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-5 md:px-8 md:pt-7">
        <Link href="/app" aria-label="Clipperie, mon espace">
          <Logo />
        </Link>
        <Link href="/app" className="py-2 text-sm font-semibold underline-offset-4 hover:underline">
          ← Mes lives
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-20 md:px-8">
        {inProgress && <AutoRefresh intervalMs={10000} maxTries={360} />}
        <p className="text-sm font-semibold tracking-[0.14em] text-rec uppercase">{status.label}</p>
        <h1 className="mt-2 font-display text-3xl leading-tight font-extrabold text-balance md:text-4xl">
          {video.title ?? "Ton live"}
        </h1>
        <p className="mt-2 text-encre-douce">
          {video.status === "pret"
            ? `${clips.length} clips, du plus prometteur au moins prometteur.`
            : video.status === "erreur"
              ? (video.error_message ?? status.detail)
              : `${status.detail} Cette page se met à jour toute seule.`}
        </p>

        {archiveUrl && (
          <a href={archiveUrl} className={`${buttonPrimary} mt-6 md:max-w-sm`}>
            Tout télécharger (.zip)
          </a>
        )}

        {!storageReady && clips.length > 0 && (
          <p className="mt-6 rounded-2xl border-2 border-rec bg-papier px-4 py-3">
            Le stockage des clips n’est pas encore configuré.
          </p>
        )}

        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {withUrls.map((clip, index) => (
            <li
              key={clip.id}
              className="flex flex-col rounded-3xl border-2 border-encre bg-papier p-3 shadow-[4px_4px_0_var(--color-encre)]"
            >
              <video
                src={clip.playUrl}
                poster={clip.posterUrl}
                controls
                playsInline
                preload="none"
                className="aspect-[9/16] w-full rounded-2xl bg-ecran object-cover"
              />
              <div className="mt-3 flex items-center justify-between text-xs font-bold text-encre-douce tabular-nums">
                <span>
                  Clip {index + 1} · {timecode(clip.start_seconds)} → {timecode(clip.end_seconds)}
                </span>
                {clip.score !== null && (
                  <span className="rounded-md bg-surligneur px-2 py-0.5 text-encre">
                    Potentiel {clip.score}/100
                  </span>
                )}
              </div>
              <p className="mt-2 font-display text-lg leading-snug font-extrabold">{clip.title}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <a
                  href={clip.downloadUrl}
                  className="inline-flex min-h-11 items-center rounded-xl bg-rec px-4 font-display font-extrabold text-white"
                >
                  Télécharger
                </a>
                {clip.title && <CopyButton text={clip.title} />}
              </div>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
