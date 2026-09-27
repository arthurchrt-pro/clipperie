import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { verticalFilter } from "./layout";
import { FFMPEG, run } from "./run";
import { inputArgs, type Source } from "./source";
import { buildAss } from "./subtitles";
import type { Box, Layout, Word } from "./types";

// Dossier des polices embarquées (sous-titres aux couleurs de Clipperie).
const FONTS_DIR = process.env.FONTS_DIR ?? resolve("assets/fonts");

// Fabrique un clip vertical sous-titré en lisant directement le passage voulu du live :
// seul le morceau utile est téléchargé.
export async function renderClip(options: {
  source: Pick<Source, "video" | "audio">;
  start: number;
  end: number;
  words: Word[];
  layout: Layout;
  box: Box | null;
  dir: string;
  name: string;
}) {
  const { source, start, end, layout, box, dir, name } = options;
  const duration = end - start;
  const assPath = join(dir, `${name}.ass`);
  const videoPath = join(dir, `${name}.mp4`);
  const thumbPath = join(dir, `${name}.jpg`);

  const relativeWords = options.words
    .filter((w) => w.start >= start - 0.05 && w.end <= end + 0.3)
    .map((w) => ({ ...w, start: w.start - start, end: w.end - start }));
  await writeFile(assPath, buildAss(relativeWords, layout, duration));

  const seek = ["-ss", start.toFixed(3), "-t", duration.toFixed(3)];
  const inputs = [...seek, ...inputArgs(source.video)];
  if (source.audio) inputs.push(...seek, ...inputArgs(source.audio));

  await run(
    FFMPEG,
    [
      "-hide_banner", "-loglevel", "error", "-y",
      ...inputs,
      "-filter_complex", verticalFilter(layout, box, assPath, FONTS_DIR),
      "-map", "[v]",
      "-map", source.audio ? "1:a:0" : "0:a:0",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
      "-profile:v", "high", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k", "-ac", "2",
      "-t", duration.toFixed(3),
      "-movflags", "+faststart",
      videoPath,
    ],
    { timeoutMs: 15 * 60 * 1000 },
  );

  await run(FFMPEG, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-ss", Math.min(1, duration / 2).toFixed(2), "-i", videoPath,
    "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "4",
    thumbPath,
  ]);

  return { videoPath, thumbPath };
}
