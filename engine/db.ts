import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

// Accès administrateur à la base, pour le moteur (hors du site web).
// Le client Supabase exige un WebSocket : on fournit celui de la bibliothèque « ws »,
// pour ne pas dépendre de la version de Node installée sur les serveurs du moteur.
export function engineDb() {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!raw || !secret) throw new Error("Supabase n’est pas configuré pour le moteur.");
  return createClient(new URL(raw).origin, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
  });
}
