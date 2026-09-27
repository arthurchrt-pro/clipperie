import { createClient } from "@supabase/supabase-js";

// Accès administrateur à la base, pour le moteur (hors du site web).
export function engineDb() {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!raw || !secret) throw new Error("Supabase n’est pas configuré pour le moteur.");
  return createClient(new URL(raw).origin, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
