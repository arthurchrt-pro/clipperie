import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./env";

// Client au nom du visiteur connecté : il ne voit que ses propres données (règles de sécurité de la base).
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Appelé depuis une page : le proxy se charge de rafraîchir la session.
        }
      },
    },
  });
}

// Client administrateur, côté serveur uniquement : crée les comptes et écrit en base.
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!supabaseUrl() || !secret) {
    throw new Error("Supabase n’est pas configuré (URL ou clé secrète manquante).");
  }
  return createSupabaseClient(supabaseUrl(), secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
