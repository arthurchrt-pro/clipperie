// Nettoie un titre de live : retire les commandes du chat (!site, !prime…)
// et les mentions entre astérisques (*Publicité*), qui n'ont rien à faire dans l'appli.
export function cleanTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  const cleaned = title
    .replace(/\*[^*]{1,40}\*/g, " ")
    .replace(/(^|\s)![\p{L}\p{N}_-]+/gu, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s|,;:–—-]+$/u, "")
    .trim();
  return cleaned || title.trim();
}
