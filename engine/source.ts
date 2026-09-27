import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { FFMPEG, mediaDuration, run, YTDLP } from "./run";

// Un flux lisible par ffmpeg : son adresse et les en-têtes HTTP à envoyer.
export type Stream = { url: string; headers: Record<string, string> };

export type Source = {
  title: string;
  channel: string | null;
  duration: number;
  video: Stream; // image (et son, si le flux est combiné)
  audio: Stream | null; // son séparé (YouTube), sinon null
  audioOnly: Stream; // le plus léger flux contenant le son, pour la transcription
};

// Erreur dont le message peut être montré tel quel au client.
export class UserFacingError extends Error {}

type YtFormat = {
  url?: string;
  vcodec?: string;
  acodec?: string;
  abr?: number;
  height?: number;
  http_headers?: Record<string, string>;
};

function ytDlpArgs() {
  const args = ["--no-playlist", "--no-warnings", "--js-runtimes", "node"];
  // Proxy facultatif, utile si YouTube bloque les serveurs.
  if (process.env.YTDLP_PROXY) args.push("--proxy", process.env.YTDLP_PROXY);
  return args;
}

function friendlyDownloadError(message: string): string {
  if (/sign in to confirm|not a bot|429|too many requests/i.test(message)) {
    return "YouTube bloque la récupération de cette vidéo pour le moment. Réessaie plus tard, ou dépose le fichier vidéo.";
  }
  if (/subscriber|subs-only|sub-only/i.test(message)) {
    return "Cette rediffusion est réservée aux abonnés de la chaîne : Clipperie ne peut pas la récupérer.";
  }
  if (/private|members-only|members only/i.test(message)) {
    return "Cette vidéo est privée ou réservée aux membres : Clipperie ne peut pas la récupérer.";
  }
  if (/does not exist|not found|404|unavailable|removed/i.test(message)) {
    return "Cette vidéo n’existe plus ou n’est pas publique. Sur Twitch, les rediffusions disparaissent après quelques jours.";
  }
  return "La vidéo n’a pas pu être récupérée. Vérifie le lien, puis réessaie.";
}

function toStream(format: YtFormat): Stream {
  if (!format.url) throw new Error("Format sans adresse");
  return { url: format.url, headers: format.http_headers ?? {} };
}

// Lit les informations de la vidéo et les adresses de ses flux, sans rien télécharger.
export async function probeSource(url: string): Promise<Source> {
  let raw: string;
  try {
    raw = await run(
      YTDLP,
      [...ytDlpArgs(), "-J", "-f", "bv*[height<=1080]+ba/b[height<=1080]/b", url],
      { timeoutMs: 3 * 60 * 1000 },
    );
  } catch (error) {
    throw new UserFacingError(friendlyDownloadError(String(error)));
  }

  const info = JSON.parse(raw) as YtFormat & {
    title?: string;
    uploader?: string;
    channel?: string;
    duration?: number;
    is_live?: boolean;
    live_status?: string;
    formats?: YtFormat[];
    requested_formats?: YtFormat[];
  };

  if (info.is_live || info.live_status === "is_live") {
    throw new UserFacingError(
      "Ce live est encore en cours. Colle le lien de la rediffusion une fois le live terminé.",
    );
  }
  if (!info.duration) {
    throw new UserFacingError("Impossible de connaître la durée de cette vidéo.");
  }

  const requested = info.requested_formats ?? [info];
  const video = toStream(requested[0]);
  const audio = requested.length > 1 ? toStream(requested[1]) : null;

  // Pour la transcription, le flux « son seul » le plus léger ; à défaut, le son de la vidéo.
  const audioFormats = (info.formats ?? [])
    .filter((f) => f.url && f.vcodec === "none" && f.acodec && f.acodec !== "none")
    .sort((a, b) => (a.abr ?? 0) - (b.abr ?? 0));
  const audioOnly = audioFormats.length
    ? toStream(audioFormats[Math.floor(audioFormats.length / 2)])
    : (audio ?? video);

  return {
    title: info.title ?? "Vidéo sans titre",
    channel: info.channel ?? info.uploader ?? null,
    duration: info.duration,
    video,
    audio,
    audioOnly,
  };
}

// Arguments ffmpeg pour lire un flux distant, à placer juste avant son « -i ».
export function inputArgs(stream: Stream): string[] {
  const headers = Object.entries(stream.headers)
    .map(([key, value]) => `${key}: ${value}\r\n`)
    .join("");
  return [...(headers ? ["-headers", headers] : []), "-i", stream.url];
}

// Récupère le son en morceaux de 20 minutes (mono, 16 kHz), prêts pour la transcription.
export async function downloadAudioChunks(stream: Stream, dir: string) {
  await run(
    FFMPEG,
    [
      "-hide_banner", "-loglevel", "error", "-y",
      ...inputArgs(stream),
      "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "32k",
      "-f", "segment", "-segment_time", "1200", "-reset_timestamps", "1",
      join(dir, "chunk_%03d.mp3"),
    ],
    { timeoutMs: 60 * 60 * 1000 },
  );

  const files = (await readdir(dir)).filter((f) => f.startsWith("chunk_")).sort();
  const chunks: { path: string; offset: number }[] = [];
  let offset = 0;
  for (const file of files) {
    const path = join(dir, file);
    chunks.push({ path, offset });
    offset += await mediaDuration(path);
  }
  return chunks;
}
