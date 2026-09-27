"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestOrigin } from "@/lib/request";
import { getPortalConfigurationId, getStripe } from "@/lib/stripe";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { parseVideoLink } from "@/lib/videoLink";

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

  const { error } = await admin.from("videos").insert({
    user_id: user.id,
    source_type: link.type,
    source_url: link.url,
    layout,
  });
  if (error) {
    console.error("Ajout de vidéo impossible", error);
    redirect("/app?erreur=technique");
  }

  revalidatePath("/app");
  redirect("/app?ajoute=1");
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
