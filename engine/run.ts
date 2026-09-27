import { spawn } from "node:child_process";

// Lance un programme (ffmpeg, yt-dlp…) et renvoie sa sortie standard.
// En cas d'échec, l'erreur contient la fin de la sortie d'erreur pour comprendre ce qui a coincé.
export function run(
  command: string,
  args: string[],
  { timeoutMs = 30 * 60 * 1000 }: { timeoutMs?: number } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-4000);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(stdout).toString());
      else reject(new Error(`${command} a échoué (${signal ?? code}) : ${stderr.trim()}`));
    });
  });
}

export const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
export const FFPROBE = process.env.FFPROBE_PATH ?? "ffprobe";
export const YTDLP = process.env.YTDLP_PATH ?? "yt-dlp";

// Durée d'un fichier audio ou vidéo, en secondes.
export async function mediaDuration(path: string): Promise<number> {
  const out = await run(FFPROBE, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    path,
  ]);
  return Number.parseFloat(out.trim()) || 0;
}
