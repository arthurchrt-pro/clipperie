import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
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

// Adresse du stockage (R2_ENDPOINT ne sert qu'aux essais sur un stockage local).
function endpoint() {
  return env("R2_ENDPOINT") || `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
}

let client: S3Client | null = null;
function r2() {
  client ??= new S3Client({
    region: "auto",
    endpoint: endpoint(),
    forcePathStyle: Boolean(env("R2_ENDPOINT")),
    // Sinon, les liens d'envoi signés portent la somme de contrôle d'un fichier vide
    // et le stockage refuse les morceaux envoyés par le navigateur.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
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
  // Vidéos déposées par les clients, effacées au bout de quelques jours.
  source: (userId: string, uploadId: string, extension: string) =>
    `sources/${userId}/${uploadId}/video.${extension}`,
  sourcePrefix: (userId: string) => `sources/${userId}/`,
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
export async function signedUrl(key: string, downloadName?: string, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: env("R2_BUCKET"),
    Key: key,
    ...(downloadName
      ? {
          ResponseContentDisposition: `attachment; filename="${downloadName.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        }
      : {}),
  });
  return getSignedUrl(r2(), command, { expiresIn });
}

// Envoi d'une vidéo depuis le navigateur, en plusieurs morceaux : le fichier va directement
// dans le stockage, sans passer par le site (qui refuse les envois de plus de quelques Mo).

export async function startMultipartUpload(key: string, contentType: string) {
  const { UploadId } = await r2().send(
    new CreateMultipartUploadCommand({ Bucket: env("R2_BUCKET"), Key: key, ContentType: contentType }),
  );
  if (!UploadId) throw new Error("Envoi en morceaux refusé par le stockage");
  return UploadId;
}

export function signPartUrl(key: string, uploadId: string, partNumber: number) {
  return getSignedUrl(
    r2(),
    new UploadPartCommand({ Bucket: env("R2_BUCKET"), Key: key, UploadId: uploadId, PartNumber: partNumber }),
    { expiresIn: 3600 },
  );
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { number: number; etag: string }[],
) {
  await r2().send(
    new CompleteMultipartUploadCommand({
      Bucket: env("R2_BUCKET"),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts.map((p) => ({ PartNumber: p.number, ETag: p.etag })) },
    }),
  );
}

export async function abortMultipartUpload(key: string, uploadId: string) {
  await r2().send(new AbortMultipartUploadCommand({ Bucket: env("R2_BUCKET"), Key: key, UploadId: uploadId }));
}

// Taille d'un fichier stocké, ou null s'il n'existe pas.
export async function storedSize(key: string): Promise<number | null> {
  try {
    const head = await r2().send(new HeadObjectCommand({ Bucket: env("R2_BUCKET"), Key: key }));
    return head.ContentLength ?? null;
  } catch {
    return null;
  }
}

export async function deleteFiles(keys: string[]) {
  for (const key of keys) {
    await r2().send(new DeleteObjectCommand({ Bucket: env("R2_BUCKET"), Key: key }));
  }
}

// Fichiers d'un dossier déposés avant une date donnée.
export async function listFilesOlderThan(prefix: string, before: Date) {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await r2().send(
      new ListObjectsV2Command({ Bucket: env("R2_BUCKET"), Prefix: prefix, ContinuationToken: token }),
    );
    for (const item of page.Contents ?? []) {
      if (item.Key && item.LastModified && item.LastModified < before) keys.push(item.Key);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

// Le navigateur n'a le droit d'envoyer un fichier au stockage que si celui-ci l'autorise
// (règle « CORS » du compartiment R2). On pose la question comme le ferait le navigateur.
export async function uploadCorsStatus(origin: string): Promise<"ok" | "manquant" | "inconnu"> {
  try {
    const response = await fetch(`${endpoint()}/${env("R2_BUCKET")}/sources/verification`, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "content-type",
      },
      signal: AbortSignal.timeout(5000),
    });
    const allowed = response.headers.get("access-control-allow-origin");
    return response.ok && (allowed === origin || allowed === "*") ? "ok" : "manquant";
  } catch {
    return "inconnu";
  }
}
