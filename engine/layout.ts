import type { Box, Corner, Layout } from "./types";

// Position de la webcam selon le coin choisi : un quart de la largeur et de la hauteur de l'image.
const FACECAM_SIZE = 0.28;

export function cornerBox(corner: Corner): Box {
  const far = 1 - FACECAM_SIZE;
  return {
    x: corner.endsWith("droite") ? far : 0,
    y: corner.startsWith("bas") ? far : 0,
    w: FACECAM_SIZE,
    h: FACECAM_SIZE,
  };
}

// Chaîne de filtres ffmpeg qui transforme l'image source en vidéo verticale 1080 × 1920.
// L'entrée est [0:v] ; la sortie s'appelle [v].
export function verticalFilter(layout: Layout, box: Box | null, subtitlesPath: string, fontsDir: string) {
  const subtitles = `subtitles=${subtitlesPath}:fontsdir=${fontsDir}`;
  if (layout === "facecam_jeu") {
    const b = box ?? cornerBox("haut_gauche");
    const TOP = 608; // webcam en 16:9 sur toute la largeur
    const BOTTOM = 1920 - TOP;
    return [
      "[0:v]split=2[cam][game]",
      `[cam]crop=iw*${b.w}:ih*${b.h}:iw*${b.x}:ih*${b.y},scale=1080:${TOP},setsar=1[top]`,
      `[game]crop=ih*1080/${BOTTOM}:ih,scale=1080:${BOTTOM},setsar=1[bottom]`,
      `[top][bottom]vstack=inputs=2,fps=30,${subtitles}[v]`,
    ].join(";");
  }
  return `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,${subtitles}[v]`;
}
