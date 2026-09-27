import Anthropic from "@anthropic-ai/sdk";
import type { Moment, Transcript, Word } from "./types";

const MIN_CLIP = 12;
const MAX_CLIP = 60;

// Nombre de clips visé : environ un toutes les 4 minutes de vidéo.
export function targetClipCount(duration: number) {
  return Math.min(60, Math.max(3, Math.round(duration / 240)));
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

const SYSTEM = `Tu es un monteur vidéo expert du format court (TikTok, Reels, Shorts), spécialisé dans les clips de lives de streamers. À partir de la transcription horodatée d’une vidéo longue, tu choisis les moments qui feront le plus de vues une fois découpés en clips verticaux, et tu écris leur accroche.`;

const SCHEMA = {
  type: "object",
  properties: {
    clips: {
      type: "array",
      items: {
        type: "object",
        properties: {
          start: { type: "number" },
          end: { type: "number" },
          title: { type: "string" },
          score: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["start", "end", "title", "score", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["clips"],
  additionalProperties: false,
};

function buildPrompt(transcript: Transcript, info: { title: string; channel: string | null; duration: number }) {
  const count = targetClipCount(info.duration);
  const lines = transcript.segments.map((s) => `[${s.start.toFixed(1)}] ${s.text}`).join("\n");
  return `Vidéo : « ${info.title} »${info.channel ? ` (${info.channel})` : ""}, durée ${formatDuration(info.duration)}.
Choisis les ${count} meilleurs moments à découper en clips.

Règles pour chaque clip :
- entre 15 et 60 secondes, jamais plus de 60 ;
- il se comprend sans avoir vu le reste : réaction forte, punchline, anecdote complète, moment drôle ou surprenant, avis tranché ;
- il commence au début d’une phrase et se termine sur une chute, jamais au milieu d’une idée ;
- les clips ne se chevauchent pas ;
- évite les silences, la lecture du chat sans réaction, les passages techniques (réglages, attente, publicité).

Pour chaque clip, donne :
- start et end : en secondes, repris des horodatages de la transcription ;
- title : l’accroche à écrire sur le post TikTok, dans la langue de la vidéo, 60 caractères maximum, qui donne envie sans mentir, sans hashtag ni emoji, avec une typographie impeccable ;
- score : de 0 à 100, le potentiel de vues estimé ;
- reason : en une phrase, pourquoi ce moment marche.

Transcription :
${lines}`;
}

// Recale un moment sur les mots réellement prononcés : début sur un mot, fin après le dernier.
function snapToWords(moment: Moment, words: Word[], duration: number): Moment | null {
  let start = Math.max(0, moment.start);
  let end = Math.min(duration, moment.end);
  if (end - start > MAX_CLIP) end = start + MAX_CLIP;

  const first = words.find((w) => w.start >= start - 0.3 && w.start < end);
  const inside = words.filter((w) => w.start >= (first?.start ?? start) && w.end <= end + 0.4);
  const last = inside[inside.length - 1];
  if (!first || !last) return null;

  start = Math.max(0, first.start - 0.1);
  end = Math.min(duration, last.end + 0.25, start + MAX_CLIP);
  if (end - start < MIN_CLIP) return null;
  return { ...moment, start, end };
}

// Nettoie la sélection : durées valides, pas de chevauchement, meilleurs moments d'abord.
export function cleanMoments(moments: Moment[], words: Word[], duration: number): Moment[] {
  const snapped = moments
    .map((m) => snapToWords(m, words, duration))
    .filter((m): m is Moment => m !== null)
    .map((m) => ({
      ...m,
      title: m.title.trim().slice(0, 90),
      score: Math.max(0, Math.min(100, Math.round(m.score))),
    }))
    .sort((a, b) => b.score - a.score);

  const kept: Moment[] = [];
  for (const moment of snapped) {
    const overlaps = kept.some((k) => moment.start < k.end + 0.5 && moment.end > k.start - 0.5);
    if (!overlaps) kept.push(moment);
  }
  return kept.sort((a, b) => a.start - b.start);
}

// Demande à Claude les meilleurs moments de la vidéo.
export async function findMoments(
  transcript: Transcript,
  info: { title: string; channel: string | null; duration: number },
): Promise<Moment[]> {
  if (transcript.segments.length === 0) return [];

  const client = new Anthropic({ maxRetries: 4 });
  const stream = client.beta.messages.stream({
    model: "claude-opus-5",
    max_tokens: 64000,
    // Si Claude refuse pour une raison de sécurité, Anthropic relance la demande sur un autre modèle.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: buildPrompt(transcript, info) }],
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error("L’analyse de la vidéo a été refusée.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("L’analyse de la vidéo a été interrompue (réponse trop longue).");
  }

  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
  const parsed = JSON.parse(text) as { clips: Moment[] };
  return cleanMoments(parsed.clips, transcript.words, info.duration);
}
