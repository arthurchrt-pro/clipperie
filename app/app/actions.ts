"use server";

import { randomUUID } from "node:crypto";
import { tasks } from "@trigger.dev/sdk";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestOrigin } from "@/lib/request";
import { getPortalConfigurationId, getStripe } from "@/lib/stripe";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  fileExtension,
  MAX_UPLOAD_BYTES,
  MIN_UPLOAD_BYTES,
  partSizeFor,
  titleFromFileName,
  type UploadPart,
  type UploadStart,
} from "@/lib/upload";
import { parseVideoLink } from "@/lib/videoLink";
import { STUCK_AFTER_MS } from "@/lib/videoStatus";
import { cornerBox } from "@/engine/layout";
import {
  abortMultipartUpload,
  completeMultipartUpload,
  deleteFiles,
  isStorageConfigured,
  signPartUrl,
  startMultipartUpload,
  storageKeys,
  storedSize,
  uploadCorsStatus,
} from "@/engine/storage";
import { cleanTitle } from "@/engine/title";
import type { Corner, Layout } from "@/engine/types";
import type { processVideo } from "@/trigger/processVideo";

const CORNERS: Corner[] = ["haut_gauche", "haut_droite", "bas_gauche", "bas_droite"];

// Envoie la vidéo au moteur de découpe (Trigger.dev). Sans clé, elle reste en file d'attente.
async function startProcessing(videoId: string) {
  if (!process.env.TRIGGER_SECRET_KEY) return;
  try {
    await tasks.trigger<typeof processVideo>("process-video", { videoId });
  } catch (error) {
    console.error("Lancement de la découpe impossible", error);
  }
}

// Nombre maximum de vidéos en attente par client, pour éviter les envois en rafale.
const MAX_PENDING_VIDEOS = 10;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  return { supabase, user };
}

function readLayout(value: unknown): Layout {
  return value === "facecam_jeu" ? "facecam_jeu" : "plein_ecran";
}

function readCorner(value: unknown): Corner {
  return CORNERS.find((c) => c === value) ?? "haut_gauche";
}

// Le client peut-il ajouter une vidéo ? Renvoie la raison du refus, sinon null.
async function blockedReason(userId: string): Promise<"abonnement" | "file" | null> {
  const admin = createAdminClient();
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .limit(1)
    .maybeSingle();
  if (!subscription) return "abonnement";

  const { count } = await admin
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "en_attente");
  if ((count ?? 0) >= MAX_PENDING_VIDEOS) return "file";
  return null;
}

async function addVideo(
  userId: string,
  fields: { source_type: "twitch" | "youtube" | "fichier"; source_url: string; title?: string },
  layout: Layout,
  corner: Corner,
) {
  const { data: video, error } = await createAdminClient()
    .from("videos")
    .insert({
      user_id: userId,
      ...fields,
      layout,
      facecam_box: layout === "facecam_jeu" ? cornerBox(corner) : null,
    })
    .select("id")
    .single();
  if (error || !video) {
    console.error("Ajout de vidéo impossible", error);
    return null;
  }
  await startProcessing(video.id);
  revalidatePath("/app");
  return video.id;
}

// Ajoute un live à découper. Tout est validé côté serveur.
export async function submitVideo(formData: FormData) {
  const { user } = await requireUser();

  const link = parseVideoLink(String(formData.get("url") ?? ""));
  if (!link) redirect("/app?erreur=lien");

  const blocked = await blockedReason(user.id);
  if (blocked) redirect(`/app?erreur=${blocked}`);

  const videoId = await addVideo(
    user.id,
    { source_type: link.type, source_url: link.url },
    readLayout(formData.get("layout")),
    readCorner(formData.get("corner")),
  );
  redirect(videoId ? "/app?ajoute=1" : "/app?erreur=technique");
}

// Dépôt d'un fichier vidéo : le navigateur l'envoie en morceaux directement au stockage,
// grâce à des liens signés que le serveur délivre un par un, après vérification.

const UPLOAD_ERRORS = {
  fichier: "Ce fichier n’est pas accepté. Dépose une vidéo MP4, MOV, MKV ou WEBM de 20 Go au plus.",
  abonnement: "Ton abonnement n’est pas actif : réactive-le pour lancer une découpe.",
  file: "Tu as déjà 10 vidéos en attente. Attends que les premières soient prêtes.",
  ferme: "Le dépôt de fichiers n’est pas encore ouvert. Colle plutôt un lien pour l’instant.",
  envoi: "L’envoi n’a pas abouti. Vérifie ta connexion, puis réessaie.",
  technique: "Petit accroc de notre côté. Réessaie dans un instant.",
};

function isOwnUpload(userId: string, key: unknown, uploadId: unknown): key is string {
  return (
    typeof key === "string" &&
    typeof uploadId === "string" &&
    uploadId.length > 0 &&
    uploadId.length <= 1024 &&
    key.startsWith(storageKeys.sourcePrefix(userId)) &&
    /^sources\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/video\.[a-z0-9]{2,4}$/.test(key)
  );
}

// Réponse du stockage sur l'autorisation d'envoi depuis le site, gardée 10 minutes.
let corsCheckedAt = 0;

export async function startUpload(input: { name: unknown; size: unknown; type: unknown }): Promise<UploadStart> {
  const { user } = await requireUser();
  const name = typeof input?.name === "string" ? input.name.slice(0, 300) : "";
  const size = typeof input?.size === "number" && Number.isSafeInteger(input.size) ? input.size : 0;
  const extension = fileExtension(name);
  if (!extension || size < MIN_UPLOAD_BYTES || size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: UPLOAD_ERRORS.fichier };
  }
  if (!isStorageConfigured()) return { ok: false, error: UPLOAD_ERRORS.ferme };

  const blocked = await blockedReason(user.id);
  if (blocked) return { ok: false, error: UPLOAD_ERRORS[blocked] };

  if (Date.now() - corsCheckedAt > 10 * 60 * 1000) {
    const cors = await uploadCorsStatus(await requestOrigin());
    if (cors === "manquant") {
      console.error("Dépôt de fichiers : la règle CORS du stockage R2 manque (voir /diagnostic)");
      return { ok: false, error: UPLOAD_ERRORS.ferme };
    }
    if (cors === "ok") corsCheckedAt = Date.now();
  }

  const type = typeof input?.type === "string" && /^video\/[\w.+-]+$/.test(input.type) ? input.type : "video/mp4";
  try {
    const key = storageKeys.source(user.id, randomUUID(), extension);
    const uploadId = await startMultipartUpload(key, type);
    return { ok: true, key, uploadId, partSize: partSizeFor(size) };
  } catch (error) {
    console.error("Début d’envoi impossible", error);
    return { ok: false, error: UPLOAD_ERRORS.technique };
  }
}

export async function signUploadParts(input: {
  key: unknown;
  uploadId: unknown;
  partNumbers: unknown;
}): Promise<{ ok: true; urls: [number, string][] } | { ok: false; error: string }> {
  const { user } = await requireUser();
  const numbers = Array.isArray(input?.partNumbers) ? input.partNumbers : [];
  if (
    !isOwnUpload(user.id, input?.key, input?.uploadId) ||
    numbers.length === 0 ||
    numbers.length > 20 ||
    !numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 10000)
  ) {
    return { ok: false, error: UPLOAD_ERRORS.envoi };
  }
  const key = input.key as string;
  const uploadId = input.uploadId as string;
  const urls = await Promise.all(
    (numbers as number[]).map(async (n) => [n, await signPartUrl(key, uploadId, n)] as [number, string]),
  );
  return { ok: true, urls };
}

export async function completeUpload(input: {
  key: unknown;
  uploadId: unknown;
  parts: unknown;
  name: unknown;
  layout: unknown;
  corner: unknown;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await requireUser();
  const parts = Array.isArray(input?.parts) ? (input.parts as UploadPart[]) : [];
  const partsValid =
    parts.length > 0 &&
    parts.length <= 10000 &&
    parts.every(
      (p, i) =>
        p?.number === i + 1 && typeof p.etag === "string" && p.etag.length > 0 && p.etag.length <= 200,
    );
  if (!isOwnUpload(user.id, input?.key, input?.uploadId) || !partsValid) {
    return { ok: false, error: UPLOAD_ERRORS.envoi };
  }
  const key = input.key as string;
  const uploadId = input.uploadId as string;

  const blocked = await blockedReason(user.id);
  if (blocked) {
    await abortMultipartUpload(key, uploadId).catch(() => {});
    return { ok: false, error: UPLOAD_ERRORS[blocked] };
  }

  try {
    await completeMultipartUpload(key, uploadId, parts);
  } catch (error) {
    console.error("Fin d’envoi impossible", error);
    return { ok: false, error: UPLOAD_ERRORS.envoi };
  }
  const size = await storedSize(key);
  if (size === null || size < MIN_UPLOAD_BYTES || size > MAX_UPLOAD_BYTES) {
    await deleteFiles([key]).catch(() => {});
    return { ok: false, error: size === null ? UPLOAD_ERRORS.envoi : UPLOAD_ERRORS.fichier };
  }

  const name = typeof input.name === "string" ? input.name.slice(0, 300) : "";
  const videoId = await addVideo(
    user.id,
    { source_type: "fichier", source_url: key, title: cleanTitle(titleFromFileName(name)) ?? "Vidéo déposée" },
    readLayout(input.layout),
    readCorner(input.corner),
  );
  return videoId ? { ok: true } : { ok: false, error: UPLOAD_ERRORS.technique };
}

// Envoi abandonné : le stockage oublie les morceaux déjà reçus.
export async function abortUpload(input: { key: unknown; uploadId: unknown }) {
  const { user } = await requireUser();
  if (!isOwnUpload(user.id, input?.key, input?.uploadId)) return;
  await abortMultipartUpload(input.key as string, input.uploadId as string).catch(() => {});
}

// Relance la découpe d'une vidéo en erreur (YouTube qui bloquait, souci passager)
// ou restée bloquée en file d'attente.
export async function retryVideo(formData: FormData) {
  const { user } = await requireUser();
  const videoId = String(formData.get("video_id") ?? "");
  const admin = createAdminClient();
  const stuckBefore = new Date(Date.now() - STUCK_AFTER_MS).toISOString();
  const { data: video } = await admin
    .from("videos")
    .update({ status: "en_attente", error_message: null })
    .eq("id", videoId)
    .eq("user_id", user.id)
    .or(`status.eq.erreur,and(status.eq.en_attente,created_at.lt.${stuckBefore})`)
    .select("id")
    .maybeSingle();
  if (video) {
    await admin.from("clips").delete().eq("video_id", video.id);
    await startProcessing(video.id);
  }
  revalidatePath("/app");
  redirect("/app");
}

// Portail Stripe : carte bancaire, factures et résiliation en ligne.
export async function openPortal() {
  const { user } = await requireUser();
  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  const stripe = getStripe();
  if (!stripe || !profile?.stripe_customer_id) redirect("/app?erreur=portail");

  let url: string | null = null;
  try {
    const origin = await requestOrigin();
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/app`,
      configuration: await getPortalConfigurationId(stripe, origin),
    });
    url = portal.url;
  } catch (error) {
    console.error("Ouverture du portail Stripe impossible", error);
  }
  redirect(url ?? "/app?erreur=portail");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
