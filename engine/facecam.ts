import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { cornerBox } from "./layout";
import type { Box, Corner } from "./types";

const CORNER_LABEL: Record<Corner, string> = {
  haut_gauche: "en haut à gauche",
  haut_droite: "en haut à droite",
  bas_gauche: "en bas à gauche",
  bas_droite: "en bas à droite",
};

const SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean" },
    left: { type: "number" },
    top: { type: "number" },
    right: { type: "number" },
    bottom: { type: "number" },
  },
  required: ["found", "left", "top", "right", "bottom"],
  additionalProperties: false,
};

// Retrouve le coin le plus proche d'un cadre (pour vérifier la cohérence avec l'indice du client).
export function cornerOf(box: Box): Corner {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return `${cy < 0.5 ? "haut" : "bas"}_${cx < 0.5 ? "gauche" : "droite"}` as Corner;
}

// Accepte le cadre proposé seulement s'il est plausible pour une webcam incrustée.
export function validateBox(
  raw: { found: boolean; left: number; top: number; right: number; bottom: number },
  hint: Corner,
): Box | null {
  if (!raw.found) return null;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const x = clamp(raw.left);
  const y = clamp(raw.top);
  const w = clamp(raw.right) - x;
  const h = clamp(raw.bottom) - y;
  if (w < 0.06 || h < 0.06 || w > 0.6 || h > 0.7) return null;
  const box = { x, y, w, h };
  return cornerOf(box) === hint ? box : null;
}

// Demande à Claude où se trouve la webcam du streamer sur une image du live.
// En cas d'échec ou de réponse incohérente, on garde la zone par défaut du coin choisi.
export async function detectFacecam(framePath: string, hint: Corner): Promise<{ box: Box; detected: boolean }> {
  const fallback = { box: cornerBox(hint), detected: false };
  try {
    const image = (await readFile(framePath)).toString("base64");
    const client = new Anthropic({ maxRetries: 3 });
    const message = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            {
              type: "text",
              text: `Cette image vient d’un live de jeu vidéo. Repère l’incrustation de la webcam du streamer : le cadre rectangulaire où l’on voit la personne filmée (pas l’interface du jeu, pas les logos). Le streamer indique qu’elle se trouve ${CORNER_LABEL[hint]}.
Donne ses bords exacts en proportions de l’image : left et right entre 0 (bord gauche) et 1 (bord droit), top et bottom entre 0 (haut) et 1 (bas). Serre au plus près du cadre de la webcam. Si aucune webcam n’est visible, réponds found = false.`,
            },
          ],
        },
      ],
    });
    if (message.stop_reason === "refusal") return fallback;
    const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const box = validateBox(JSON.parse(text), hint);
    return box ? { box, detected: true } : fallback;
  } catch {
    return fallback;
  }
}
