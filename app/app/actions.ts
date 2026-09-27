"use server";

import { tasks } from "@trigger.dev/sdk";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestOrigin } from "@/lib/request";
import { getPortalConfigurationId, getStripe } from "@/lib/stripe";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { parseVideoLink } from "@/lib/videoLink";
import { cornerBox } from "@/engine/layout";
import type { Corner } from "@/engine/types";
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

// Ajoute un live à découper. Tout est validé côté serveur.
export async function submitVideo(formData: FormData) {
  const { user } = await requireUser();

  const link = parseVideoLink(String(formData.get("url") ?? ""));
  if (!link) redirect("/app?erreur=lien");
  const layout = formData.get("layout") === "facecam_jeu" ? "facecam_jeu" : "plein_ecran";
  const cornerInput = String(formData.get("corner") ?? "");
  const corner = CORNERS.find((c) => c === cornerInput) ?? "haut_gauche";

  const admin = createAdminClient();
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .limit(1)
    .maybeSingle();
  if (!subscription) redirect("/app?erreur=abonnement");

  const { count } = await admin
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "en_attente");
  if ((count ?? 0) >= MAX_PENDING_VIDEOS) redirect("/app?erreur=file");

  const { data: video, error } = await admin
    .from("videos")
    .insert({
      user_id: user.id,
      source_type: link.type,
      source_url: link.url,
      layout,
      facecam_box: layout === "facecam_jeu" ? cornerBox(corner) : null,
    })
    .select("id")
    .single();
  if (error || !video) {
    console.error("Ajout de vidéo impossible", error);
    redirect("/app?erreur=technique");
  }

  await startProcessing(video.id);
  revalidatePath("/app");
  redirect("/app?ajoute=1");
}

// Relance la découpe d'une vidéo en erreur (par exemple si YouTube bloquait temporairement).
export async function retryVideo(formData: FormData) {
  const { user } = await requireUser();
  const videoId = String(formData.get("video_id") ?? "");
  const admin = createAdminClient();
  const { data: video } = await admin
    .from("videos")
    .update({ status: "en_attente", error_message: null })
    .eq("id", videoId)
    .eq("user_id", user.id)
    .eq("status", "erreur")
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
