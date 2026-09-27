import { createReadStream } from "node:fs";
import Groq from "groq-sdk";
import type { Segment, Transcript, Word } from "./types";

type VerboseTranscription = {
  language?: string;
  segments?: { text: string; start: number; end: number }[];
  words?: { word: string; start: number; end: number }[];
};

// Remet la ponctuation de la phrase sur les mots, quand les deux découpages concordent.
function punctuate(words: Word[], segments: Segment[]): Word[] {
  const result: Word[] = [];
  let index = 0;
  for (const segment of segments) {
    const inSegment: Word[] = [];
    while (index < words.length && words[index].start < segment.end - 0.01) {
      inSegment.push(words[index]);
      index += 1;
    }
    const tokens = segment.text.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === inSegment.length) {
      inSegment.forEach((word, i) => result.push({ ...word, text: tokens[i] }));
    } else {
      result.push(...inSegment);
    }
  }
  result.push(...words.slice(index));
  return result;
}

// Transcrit chaque morceau de son avec Whisper (via Groq) et remet les horodatages bout à bout.
export async function transcribe(chunks: { path: string; offset: number }[]): Promise<Transcript> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 6 });
  const words: Word[] = [];
  const segments: Segment[] = [];
  let language: string | null = null;

  for (const chunk of chunks) {
    const response = (await groq.audio.transcriptions.create({
      file: createReadStream(chunk.path),
      model: "whisper-large-v3-turbo",
      response_format: "verbose_json",
      timestamp_granularities: ["word", "segment"],
      temperature: 0,
    })) as unknown as VerboseTranscription;

    language ??= response.language ?? null;
    const chunkSegments = (response.segments ?? []).map((s) => ({
      text: s.text.trim(),
      start: s.start + chunk.offset,
      end: s.end + chunk.offset,
    }));
    const chunkWords = (response.words ?? []).map((w) => ({
      text: w.word.trim(),
      start: w.start + chunk.offset,
      end: w.end + chunk.offset,
    }));
    segments.push(...chunkSegments.filter((s) => s.text));
    words.push(...punctuate(chunkWords, chunkSegments).filter((w) => w.text));
  }

  return { language, words, segments };
}
