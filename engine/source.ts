import { randomBytes } from "node:crypto";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { FFMPEG, FFPROBE, mediaDuration, run, YTDLP } from "./run";

// Un flux lisible par ffmpeg : son adresse, les en-têtes HTTP à envoyer,
// et le proxy par lequel passer (YouTube lie ses liens à l'adresse qui les a demandés).
export type Stream = { url: string; headers: Record<string, string>; proxy?: string | null };

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
  protocol?: string;
  vcodec?: string;
  acodec?: string;
  abr?: number;
  height?: number;
  http_headers?: Record<string, string>;
};

// Proxy résidentiel pour YouTube (YTDLP_PROXY), qui bloque les serveurs.
// Chaque appel ouvre une nouvelle « session » : une même adresse IP pendant deux heures au plus,
// pour que yt-dlp et ffmpeg passent par la même adresse. Chez DataImpulse, la session est
// ajoutée toute seule à l'identifiant ; chez un autre fournisseur, écrire {session} là où elle va.
export function youtubeProxy(): string | null {
  const raw = process.env.YTDLP_PROXY?.trim();
  if (!raw) return null;
  const withScheme = /^[a-z0-9]+:\/\//i.test(raw) ? raw : `http://${raw}`;
  const session = randomBytes(6).toString("hex");
  if (withScheme.includes("{session}")) return withScheme.replaceAll("{session}", session);

  const match = withScheme.match(/^(https?:\/\/)([^:@/]+)(:[^@/]*)?@([^/]+)\/?$/i);
  if (match && /dataimpulse\.com/i.test(match[4]) && !/sessid\./.test(match[2])) {
    const [, scheme, login, password = "", host] = match;
    const options = `sessid.${session};sessttl.120`;
    return `${scheme}${login}${login.includes("__") ? ";" : "__"}${options}${password}@${host}`;
  }
  return withScheme;
}

function ytDlpArgs(proxy: string | null) {
  const args = ["--no-playlist", "--no-warnings", "--js-runtimes", "node"];
  if (proxy) args.push("--proxy", proxy);
  return args;
}

function friendlyDownloadError(message: string, youtube: boolean): string {
  if (/subscriber|subs-only|sub-only/i.test(message)) {
    return "Cette rediffusion est réservée aux abonnés de la chaîne : Clipperie ne peut pas la récupérer.";
  }
  if (/confirm your age|age-restricted|inappropriate for some users/i.test(message)) {
    return "Cette vidéo est réservée aux adultes sur YouTube : Clipperie ne peut pas la récupérer. Dépose le fichier vidéo à la place.";
  }
  if (/private|members-only|members only/i.test(message)) {
    return "Cette vidéo est privée ou réservée aux membres : Clipperie ne peut pas la récupérer.";
  }
  if (/does not exist|not found|404|unavailable|removed/i.test(message)) {
    return "Cette vidéo n’existe plus ou n’est pas publique. Sur Twitch, les rediffusions disparaissent après quelques jours.";
  }
  if (youtube || /sign in to confirm|not a bot|429|too many requests/i.test(message)) {
    return "YouTube bloque la récupération de cette vidéo pour le moment. Réessaie plus tard, ou dépose le fichier vidéo.";
  }
  return "La vidéo n’a pas pu être récupérée. Vérifie le lien, puis réessaie.";
}

function toStream(format: YtFormat, proxy: string | null): Stream {
  if (!format.url) throw new Error("Format sans adresse");
  return { url: format.url, headers: format.http_headers ?? {}, proxy };
}

// Formats choisis : la meilleure image jusqu'en 1080p, en 30 images par seconde si cette
// résolution existe aussi en 30 i/s (les clips sont en 30 i/s : inutile de payer le double
// de données au proxy).
const FORMAT_ARGS = ["-S", "res:1080,fps:30", "-f", "bv*+ba/b"];

// Lit les informations de la vidéo et les adresses de ses flux, sans rien télécharger.
// `proxy` : pour YouTube, voir youtubeProxy() ; `streamProxy` : l'adresse par laquelle ffmpeg
// rejoint ce même proxy (le relais local, voir proxyRelay.ts).
export async function probeSource(
  url: string,
  proxy: string | null = null,
  streamProxy: string | null = proxy,
): Promise<Source> {
  let raw: string;
  try {
    raw = await run(YTDLP, [...ytDlpArgs(proxy), "-J", ...FORMAT_ARGS, url], {
      timeoutMs: 3 * 60 * 1000,
    });
  } catch (error) {
    throw new UserFacingError(friendlyDownloadError(String(error), /youtu\.?be/i.test(url)));
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
  const video = toStream(requested[0], streamProxy);
  const audio = requested.length > 1 ? toStream(requested[1], streamProxy) : null;

  // Pour la transcription, un flux « son seul » de qualité moyenne ; à défaut, le son de la vidéo.
  // Avec un proxy (payé au volume), le plus léger qui reste net pour la reconnaissance vocale.
  const audioFormats = (info.formats ?? [])
    .filter((f) => f.url && f.vcodec === "none" && f.acodec && f.acodec !== "none")
    .sort((a, b) => (a.abr ?? 0) - (b.abr ?? 0));
  const lightAudio = proxy
    ? audioFormats.find((f) => (f.abr ?? 0) >= 45 && f.protocol === "https")
    : undefined;
  const audioOnly = audioFormats.length
    ? toStream(lightAudio ?? audioFormats[Math.floor(audioFormats.length / 2)], streamProxy)
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

// Vidéo déposée par le client (lue dans le stockage grâce à un lien signé).
export async function probeFile(url: string, title: string): Promise<Source> {
  let info: { format?: { duration?: string }; streams?: { codec_type?: string }[] };
  try {
    const raw = await run(
      FFPROBE,
      ["-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", url],
      { timeoutMs: 3 * 60 * 1000 },
    );
    info = JSON.parse(raw);
  } catch (error) {
    if (/404|not found/i.test(String(error))) {
      throw new UserFacingError("Le fichier n’est plus disponible : dépose-le à nouveau.");
    }
    throw new UserFacingError("Ce fichier n’est pas une vidéo lisible. Dépose un fichier MP4, MOV, MKV ou WEBM.");
  }

  const duration = Number.parseFloat(info.format?.duration ?? "");
  const streams = info.streams ?? [];
  if (!streams.some((s) => s.codec_type === "video") || !(duration > 0)) {
    throw new UserFacingError("Ce fichier n’est pas une vidéo lisible. Dépose un fichier MP4, MOV, MKV ou WEBM.");
  }
  if (!streams.some((s) => s.codec_type === "audio")) {
    throw new UserFacingError("Cette vidéo n’a pas de son : impossible de la sous-titrer.");
  }

  const stream: Stream = { url, headers: {} };
  return { title, channel: null, duration, video: stream, audio: null, audioOnly: stream };
}

// Arguments ffmpeg pour lire un flux distant, à placer juste avant son « -i ».
export function inputArgs(stream: Stream): string[] {
  const headers = Object.entries(stream.headers)
    .map(([key, value]) => `${key}: ${value}\r\n`)
    .join("");
  return [
    ...(stream.proxy ? ["-http_proxy", stream.proxy] : []),
    ...(headers ? ["-headers", headers] : []),
    "-i",
    stream.url,
  ];
}

// Extrait une image du live à un instant donné (pour repérer la webcam).
export async function extractFrame(stream: Stream, at: number, path: string) {
  await run(
    FFMPEG,
    [
      "-hide_banner", "-loglevel", "error", "-y",
      "-ss", at.toFixed(1),
      ...inputArgs(stream),
      "-frames:v", "1", "-vf", "scale=1280:-2", "-q:v", "3",
      path,
    ],
    { timeoutMs: 3 * 60 * 1000 },
  );
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
