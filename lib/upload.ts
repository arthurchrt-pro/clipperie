// Règles du dépôt de fichiers vidéo, partagées par le navigateur et le serveur.

const MIB = 1024 * 1024;

export const MAX_UPLOAD_BYTES = 20 * 1024 * MIB; // 20 Go
export const MIN_UPLOAD_BYTES = 1 * MIB;
export const UPLOAD_EXTENSIONS = ["mp4", "mov", "m4v", "mkv", "webm", "avi", "flv", "ts"] as const;
export const UPLOAD_ACCEPT = `video/*,${UPLOAD_EXTENSIONS.map((e) => `.${e}`).join(",")}`;

// Le fichier part en morceaux d'au moins 32 Mo (10 000 morceaux au plus).
export function partSizeFor(size: number) {
  return Math.max(32 * MIB, Math.ceil(size / 9000 / MIB) * MIB);
}

export function fileExtension(name: string) {
  const extension = name.toLowerCase().match(/\.([a-z0-9]{2,4})$/)?.[1] ?? "";
  return (UPLOAD_EXTENSIONS as readonly string[]).includes(extension) ? extension : null;
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * MIB) return `${(bytes / (1024 * MIB)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Go`;
  return `${Math.max(1, Math.round(bytes / MIB))} Mo`;
}

// Titre affiché pour une vidéo déposée : son nom de fichier, sans l'extension.
export function titleFromFileName(name: string) {
  const title = name
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 120);
  return title || "Vidéo déposée";
}

export type UploadPart = { number: number; etag: string };

export type UploadStart =
  | { ok: true; key: string; uploadId: string; partSize: number }
  | { ok: false; error: string };
