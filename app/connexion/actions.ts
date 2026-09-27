"use server";

import { redirect } from "next/navigation";
import { requestOrigin } from "@/lib/request";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// Envoie un lien de connexion par email (pas de mot de passe).
export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const back = (params: string) =>
    redirect(`/connexion?${params}&email=${encodeURIComponent(email)}`);

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    back("erreur=email");
  }
  if (!isSupabaseConfigured()) back("erreur=config");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${await requestOrigin()}/auth/confirm`,
    },
  });
  if (error?.status === 429) back("erreur=limite");
  // Adresse inconnue ou autre souci : même réponse qu'en cas de succès,
  // pour ne pas révéler qui est client.
  if (error) console.warn("Lien de connexion non envoyé :", error.message);

  back("envoye=1");
}
