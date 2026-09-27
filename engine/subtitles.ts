import type { Layout, Word } from "./types";

// Sous-titres façon karaoké : quelques mots à la fois, le mot prononcé surligné en jaune Clipperie.
// Format ASS (lu par ffmpeg/libass), pour une vidéo verticale 1080 × 1920.

const FONT = "Bricolage Grotesque 96pt ExtraBold";
const WHITE = "&H00FFFFFF";
const YELLOW = "&H003FD2FF"; // #FFD23F en ordre BGR
const INK = "&H001B171B"; // contour sombre
const MAX_CHARS = 16;
const MAX_WORDS = 3;
const MAX_GAP = 0.6; // une pause plus longue démarre un nouveau groupe

function timestamp(seconds: number) {
  const total = Math.round(Math.max(0, seconds) * 100); // en centièmes, sans erreur d'arrondi
  const h = Math.floor(total / 360000);
  const m = Math.floor((total % 360000) / 6000);
  const sec = Math.floor((total % 6000) / 100);
  const cs = total % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function clean(text: string) {
  return text.replace(/[{}\\]/g, "").replace(/[ \t\r\n]+/g, " ").trim().toLocaleUpperCase("fr-FR");
}

// Rattache la ponctuation isolée au mot précédent, avec l'espace insécable
// qu'exige la typographie française devant ! ? : ;
function attachPunctuation(words: Word[]): Word[] {
  const result: Word[] = [];
  for (const word of words) {
    const text = word.text.trim();
    const previous = result[result.length - 1];
    if (previous && /^[!?:;…,.»]+$/.test(text)) {
      const space = /^[!?:;»]/.test(text) ? "\u00a0" : "";
      result[result.length - 1] = { ...previous, text: previous.text + space + text, end: word.end };
    } else if (text) {
      result.push({ ...word, text });
    }
  }
  return result;
}

// Regroupe les mots en courtes lignes lisibles d'un coup d'œil.
export function groupWords(rawWords: Word[]): Word[][] {
  const words = attachPunctuation(rawWords);
  const groups: Word[][] = [];
  let current: Word[] = [];
  for (const word of words) {
    const text = clean(word.text);
    if (!text) continue;
    const length = current.reduce((n, w) => n + clean(w.text).length + 1, 0) + text.length;
    const gap = current.length ? word.start - current[current.length - 1].end : 0;
    if (current.length && (current.length >= MAX_WORDS || length > MAX_CHARS || gap > MAX_GAP)) {
      groups.push(current);
      current = [];
    }
    current.push(word);
    if (/[.!?…,;:]$/.test(word.text.trim())) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

// Construit le fichier ASS pour un clip. Les temps des mots sont relatifs au début du clip.
export function buildAss(words: Word[], layout: Layout, clipDuration: number): string {
  // Plein écran : dans le tiers bas. Facecam + jeu : juste sous la webcam.
  const alignment = layout === "facecam_jeu" ? 5 : 2;
  const marginV = layout === "facecam_jeu" ? 0 : 520;
  const position = layout === "facecam_jeu" ? "{\\pos(540,720)}" : "";

  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Clip,${FONT},104,${WHITE},${WHITE},${INK},&H80000000,0,0,0,0,100,100,1,0,1,7,3,${alignment},60,60,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const events: string[] = [];
  const groups = groupWords(words);
  groups.forEach((group, g) => {
    const nextGroupStart = groups[g + 1]?.[0].start ?? clipDuration;
    group.forEach((word, i) => {
      const start = word.start;
      const end = i < group.length - 1 ? group[i + 1].start : Math.min(nextGroupStart, word.end + 0.5);
      if (end <= start) return;
      const text = group
        .map((w, j) =>
          j === i ? `{\\c${YELLOW}}${clean(w.text)}{\\c${WHITE}}` : clean(w.text),
        )
        .join(" ");
      events.push(`Dialogue: 0,${timestamp(start)},${timestamp(end)},Clip,,0,0,0,,${position}${text}`);
    });
  });

  return [...header, ...events, ""].join("\n");
}
