// Libellés des étapes de découpe, affichés au client.
export const STATUS: Record<string, { label: string; detail: string }> = {
  en_attente: { label: "En file d’attente", detail: "La découpe va démarrer." },
  telechargement: { label: "Récupération", detail: "On récupère le live…" },
  transcription: { label: "Transcription", detail: "On écoute tout le live…" },
  analyse: { label: "Repérage", detail: "On cherche les meilleurs moments…" },
  rendu: { label: "Découpe", detail: "On fabrique tes clips…" },
  pret: { label: "Clips prêts", detail: "Tes clips t’attendent." },
  erreur: { label: "Erreur", detail: "Ce live n’a pas pu être découpé." },
};

export const IN_PROGRESS = ["en_attente", "telechargement", "transcription", "analyse", "rendu"];

// Délai au-delà duquel une vidéo restée en file d'attente peut être relancée.
export const STUCK_AFTER_MS = 10 * 60 * 1000;

// Une vidéo peut être relancée si elle est en erreur, ou bloquée en file d'attente.
export function canRetry(status: string, createdAt: string) {
  return (
    status === "erreur" ||
    (status === "en_attente" && Date.parse(createdAt) < Date.now() - STUCK_AFTER_MS)
  );
}
