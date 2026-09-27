// Variables Supabase. La clé publique peut être vue par le navigateur ; la clé secrète jamais.

export function supabaseUrlRaw() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

// Adresse du projet réduite à l'essentiel : un chemin collé en trop (ex. /rest/v1/) est retiré.
export function supabaseUrl() {
  const raw = supabaseUrlRaw();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
}

export function supabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabasePublishableKey());
}
