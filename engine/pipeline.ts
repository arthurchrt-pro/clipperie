import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ZipArchive } from "archiver";
import { findMoments } from "./analyze";
import { renderClip } from "./clip";
import { engineDb } from "./db";
import { downloadAudioChunks, probeSource, UserFacingError } from "./source";
import { storageKeys, uploadFile } from "./storage";
import { transcribe } from "./transcribe";
import type { Box, Layout } from "./types";

type Log = (message: string, data?: Record<string, unknown>) => void;

const QUOTA_SECONDS = 20 * 3600;
const PARALLEL_RENDERS = 2;

type VideoStatus = "telechargement" | "transcription" | "analyse" | "rendu" | "pret" | "erreur";

function safeFileName(text: string) {
  return text.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "clip";
}

// Exécute des tâches avec un nombre limité en parallèle.
async function pool<T>(items: T[], size: number, worker: (item: T, index: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        await worker(items[index], index);
      }
    }),
  );
}

// Transforme une vidéo en clips : récupération, transcription, choix des moments, découpe, stockage.
export async function processVideo(videoId: string, log: Log) {
  const db = engineDb();
  const setStatus = async (status: VideoStatus, extra: Record<string, unknown> = {}) => {
    const { error } = await db.from("videos").update({ status, ...extra }).eq("id", videoId);
    if (error) throw error;
    log(`Étape : ${status}`);
  };

  const { data: video, error } = await db
    .from("videos")
    .select("id, user_id, source_url, layout, facecam_box, created_at")
    .eq("id", videoId)
    .single();
  if (error || !video?.source_url) throw error ?? new Error("Vidéo introuvable");

  const workDir = await mkdtemp(join(tmpdir(), "clipperie-"));
  try {
    // 1. Informations sur la vidéo et contrôle du quota mensuel.
    await setStatus("telechargement");
    const source = await probeSource(video.source_url);
    await db.from("videos").update({ title: source.title, duration_seconds: Math.round(source.duration) }).eq("id", videoId);

    const { data: subscription } = await db
      .from("subscriptions")
      .select("current_period_start")
      .eq("user_id", video.user_id)
      .in("status", ["active", "trialing"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subscription?.current_period_start) {
      const { data: others } = await db
        .from("videos")
        .select("duration_seconds")
        .eq("user_id", video.user_id)
        .neq("id", videoId)
        .neq("status", "erreur")
        .gte("created_at", subscription.current_period_start);
      const used = (others ?? []).reduce((sum, v) => sum + (v.duration_seconds ?? 0), 0);
      if (used + source.duration > QUOTA_SECONDS) {
        const left = Math.max(0, QUOTA_SECONDS - used);
        throw new UserFacingError(
          `Ce live dure ${Math.round(source.duration / 60)} min, mais il te reste ${Math.floor(left / 60)} min ce mois-ci.`,
        );
      }
    }

    // 2. Transcription.
    await setStatus("transcription");
    const chunks = await downloadAudioChunks(source.audioOnly, workDir);
    const transcript = await transcribe(chunks);
    log("Transcription terminée", { mots: transcript.words.length, langue: transcript.language });
    if (transcript.words.length < 20) {
      throw new UserFacingError("On n’entend presque personne parler dans cette vidéo : impossible d’en tirer des clips.");
    }

    // 3. Choix des moments forts.
    await setStatus("analyse");
    const moments = await findMoments(transcript, source);
    log("Moments choisis", { clips: moments.length });
    if (moments.length === 0) {
      throw new UserFacingError("Aucun moment assez fort n’a été trouvé dans cette vidéo.");
    }

    const { data: clips, error: insertError } = await db
      .from("clips")
      .insert(
        moments.map((m) => ({
          video_id: videoId,
          user_id: video.user_id,
          start_seconds: Number(m.start.toFixed(3)),
          end_seconds: Number(m.end.toFixed(3)),
          title: m.title,
          score: m.score,
          transcript: transcript.words
            .filter((w) => w.start >= m.start && w.end <= m.end + 0.3)
            .map((w) => w.text)
            .join(" "),
        })),
      )
      .select("id, start_seconds, end_seconds, title");
    if (insertError || !clips) throw insertError ?? new Error("Clips non enregistrés");

    // 4. Découpe et stockage.
    await setStatus("rendu");
    const done: { path: string; title: string }[] = [];
    await pool(clips, PARALLEL_RENDERS, async (clip, index) => {
      try {
        const { videoPath, thumbPath } = await renderClip({
          source,
          start: Number(clip.start_seconds),
          end: Number(clip.end_seconds),
          words: transcript.words,
          layout: video.layout as Layout,
          box: video.facecam_box as Box | null,
          dir: workDir,
          name: clip.id,
        });
        const key = storageKeys.clip(video.user_id, videoId, clip.id);
        await uploadFile(key, videoPath, "video/mp4");
        await uploadFile(storageKeys.thumbnail(video.user_id, videoId, clip.id), thumbPath, "image/jpeg");
        await db.from("clips").update({ file_path: key }).eq("id", clip.id);
        done[index] = { path: videoPath, title: clip.title ?? `Clip ${index + 1}` };
        log(`Clip ${index + 1}/${clips.length} prêt`);
      } catch (renderError) {
        log(`Clip ${index + 1} en échec`, { erreur: String(renderError).slice(0, 500) });
      }
    });

    const ready = done
      .map((item, index) => (item ? { ...item, number: index + 1 } : null))
      .filter((item): item is { path: string; title: string; number: number } => item !== null);
    if (ready.length === 0) throw new Error("Aucun clip n’a pu être fabriqué.");

    // 5. Archive de tous les clips, avec leurs accroches, pour le téléchargement en un clic.
    const zipPath = join(workDir, "clipperie.zip");
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const zip = new ZipArchive({ store: true });
      output.on("close", () => resolve());
      zip.on("error", reject);
      zip.pipe(output);
      for (const item of ready) {
        const number = String(item.number).padStart(2, "0");
        zip.file(item.path, { name: `${number} - ${safeFileName(item.title)}.mp4` });
      }
      zip.append(
        ready.map((item) => `${String(item.number).padStart(2, "0")}. ${item.title}`).join("\n") + "\n",
        { name: "accroches.txt" },
      );
      void zip.finalize();
    });
    await uploadFile(storageKeys.archive(video.user_id, videoId), zipPath, "application/zip");

    await setStatus("pret", { error_message: null });
    log("Vidéo terminée", { clips: ready.length });
  } catch (failure) {
    const message =
      failure instanceof UserFacingError
        ? failure.message
        : "Un souci technique a interrompu la découpe. Réessaie dans quelques minutes.";
    log("Échec de la découpe", { erreur: String(failure).slice(0, 1000) });
    await db.from("videos").update({ status: "erreur", error_message: message }).eq("id", videoId);
    throw failure;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
