import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Stockage des clips sur Cloudflare R2 (compatible S3). Rien n'y est public :
// chaque téléchargement passe par un lien signé, valable une heure.

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function isStorageConfigured() {
  return Boolean(
    env("R2_ACCOUNT_ID") && env("R2_ACCESS_KEY_ID") && env("R2_SECRET_ACCESS_KEY") && env("R2_BUCKET"),
  );
}

let client: S3Client | null = null;
function r2() {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

// Emplacements des fichiers d'une vidéo.
export const storageKeys = {
  clip: (userId: string, videoId: string, clipId: string) => `clips/${userId}/${videoId}/${clipId}.mp4`,
  thumbnail: (userId: string, videoId: string, clipId: string) => `clips/${userId}/${videoId}/${clipId}.jpg`,
  archive: (userId: string, videoId: string) => `clips/${userId}/${videoId}/clipperie.zip`,
  transcript: (userId: string, videoId: string) => `clips/${userId}/${videoId}/transcription.json`,
  frame: (userId: string, videoId: string) => `clips/${userId}/${videoId}/image-webcam.jpg`,
};

export async function uploadFile(key: string, path: string, contentType: string) {
  const { size } = await stat(path);
  await new Upload({
    client: r2(),
    params: {
      Bucket: env("R2_BUCKET"),
      Key: key,
      Body: createReadStream(path),
      ContentType: contentType,
      ContentLength: size,
    },
  }).done();
}

// Lien temporaire vers un fichier ; avec `downloadName`, le navigateur le télécharge au lieu de l'afficher.
export async function signedUrl(key: string, downloadName?: string) {
  const command = new GetObjectCommand({
    Bucket: env("R2_BUCKET"),
    Key: key,
    ...(downloadName
      ? {
          ResponseContentDisposition: `attachment; filename="${downloadName.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        }
      : {}),
  });
  return getSignedUrl(r2(), command, { expiresIn: 3600 });
}
